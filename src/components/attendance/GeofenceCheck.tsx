"use client";

import { useEffect, useState } from 'react';
import { MapPin, Clock, X, LogOut } from 'lucide-react';
import { clockIn, clockOut, getTodayAttendance, getWorkspaceGeofence } from '@/app/actions/attendance';

interface GeofenceCheckProps {
    workspaceId: string;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // Earth radius in metres
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type BannerState = 'hidden' | 'clocked-in' | 'already-in' | 'clocked-out';

export default function GeofenceCheck({ workspaceId }: GeofenceCheckProps) {
    const [banner, setBanner] = useState<BannerState>('hidden');
    const [clockInTime, setClockInTime] = useState<string>('');
    const [clockOutTime, setClockOutTime] = useState<string>('');
    const [isInsideFence, setIsInsideFence] = useState(false);
    const [todayRecord, setTodayRecord] = useState<any>(null);

    useEffect(() => {
        let dismissed = false;

        async function run() {
            if (!navigator.geolocation) return;

            // Load geofence config and today's record in parallel
            const [geofence, existing] = await Promise.all([
                getWorkspaceGeofence(workspaceId),
                getTodayAttendance(workspaceId),
            ]);

            if (!geofence?.geofenceEnabled || !geofence.geofenceLat || !geofence.geofenceLng) return;

            setTodayRecord(existing);

            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    if (dismissed) return;
                    const dist = haversineDistance(
                        pos.coords.latitude, pos.coords.longitude,
                        geofence.geofenceLat!, geofence.geofenceLng!
                    );

                    const inside = dist <= (geofence.geofenceRadius ?? 150);
                    setIsInsideFence(inside);

                    if (!inside) return;

                    if (existing) {
                        // Already clocked in — show status briefly
                        const t = new Date(existing.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        setClockInTime(t);
                        setBanner('already-in');
                        setTimeout(() => setBanner('hidden'), 4000);
                        return;
                    }

                    // Not clocked in yet — clock in now
                    const result = await clockIn(workspaceId, pos.coords.latitude, pos.coords.longitude);
                    if (result.success && result.data) {
                        const t = new Date(result.data.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        setClockInTime(t);
                        setTodayRecord(result.data);
                        setBanner('clocked-in');
                    }
                },
                () => {}, // silently ignore denied geolocation
                { timeout: 8000, maximumAge: 60000 }
            );
        }

        run();
    }, [workspaceId]);

    async function handleClockOut() {
        const result = await clockOut(workspaceId);
        if (result.success && result.data) {
            const t = new Date(result.data.clockOut!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setClockOutTime(t);
            setTodayRecord(result.data);
            setBanner('clocked-out');
            setTimeout(() => setBanner('hidden'), 5000);
        }
    }

    if (banner === 'hidden') {
        // Show a small persistent dot if clocked in
        if (todayRecord && !todayRecord.clockOut && isInsideFence) {
            return (
                <div
                    style={{
                        position: 'fixed', bottom: 24, right: 24,
                        background: '#0f172a', borderRadius: 12,
                        padding: '0.5rem 0.85rem',
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontSize: '0.78rem', color: '#fff',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                        zIndex: 999, cursor: 'default',
                    }}
                >
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', display: 'inline-block', flexShrink: 0 }} />
                    Clocked in · {clockInTime || new Date(todayRecord.clockIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    <button
                        onClick={handleClockOut}
                        title="Clock out"
                        style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 6, cursor: 'pointer', padding: '2px 7px', color: '#fff', fontSize: '0.72rem', marginLeft: 4, display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                        <LogOut size={11} /> Out
                    </button>
                </div>
            );
        }
        return null;
    }

    const isClockIn = banner === 'clocked-in' || banner === 'already-in';

    return (
        <div
            style={{
                position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
                background: isClockIn ? '#0f172a' : '#1e293b',
                borderRadius: 14,
                padding: '0.9rem 1.5rem',
                display: 'flex', alignItems: 'center', gap: 14,
                boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
                zIndex: 9999,
                minWidth: 320,
                animation: 'slideDown 0.35s cubic-bezier(0.16,1,0.3,1)',
            }}
        >
            <style>{`@keyframes slideDown { from { opacity:0; transform: translateX(-50%) translateY(-16px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }`}</style>

            <div style={{
                width: 36, height: 36, borderRadius: '50%',
                background: banner === 'clocked-out' ? 'rgba(239,68,68,0.15)' : 'rgba(34,197,94,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
                {banner === 'clocked-out'
                    ? <LogOut size={17} color="#f87171" />
                    : <MapPin size={17} color="#4ade80" />
                }
            </div>

            <div style={{ flex: 1 }}>
                {banner === 'clocked-in' && (
                    <>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>You're at the office</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Clock size={11} /> Clocked in at {clockInTime}
                        </div>
                    </>
                )}
                {banner === 'already-in' && (
                    <>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>Welcome back</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Clock size={11} /> Clocked in at {clockInTime}
                        </div>
                    </>
                )}
                {banner === 'clocked-out' && (
                    <>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc' }}>Clocked out</div>
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
                            <Clock size={11} /> Left at {clockOutTime}
                        </div>
                    </>
                )}
            </div>

            <button
                onClick={() => setBanner('hidden')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4, flexShrink: 0 }}
            >
                <X size={16} />
            </button>
        </div>
    );
}
