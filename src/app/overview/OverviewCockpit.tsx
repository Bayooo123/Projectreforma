"use client";

import { useState } from 'react';
import {
    Briefcase, Gavel, FileText, DollarSign,
    ChevronRight, X, Search
} from 'lucide-react';
import BriefUploadModal from '@/components/briefs/BriefUploadModal';
import AddMatterModal from '@/components/calendar/AddMatterModal';
import InvoiceModal from '@/components/management/InvoiceModal';
import PaymentModal from '@/components/management/PaymentModal';

interface Client {
    id: string;
    name: string;
    company: string | null;
}

interface OverviewCockpitProps {
    workspaceId: string;
    userId: string;
    userName: string;
    clients: Client[];
}

export default function OverviewCockpit({ workspaceId, userId, userName, clients }: OverviewCockpitProps) {
    const [activeModal, setActiveModal] = useState<'brief' | 'matter' | 'invoice' | 'payment' | null>(null);
    const [showClientPicker, setShowClientPicker] = useState<'invoice' | 'payment' | null>(null);
    const [targetClientId, setTargetClientId] = useState<string>('');
    const [targetClientName, setTargetClientName] = useState<string>('');
    const [searchTerm, setSearchTerm] = useState('');

    const handleActionClick = (action: 'invoice' | 'payment') => {
        setSearchTerm('');
        setShowClientPicker(action);
    };

    const handleClientSelect = (client: Client) => {
        setTargetClientId(client.id);
        setTargetClientName(client.name);
        const nextModal = showClientPicker;
        setShowClientPicker(null);
        setActiveModal(nextModal);
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="w-full mb-8">
            {/* Primary Action Buttons (2-Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button
                    onClick={() => setActiveModal('brief')}
                    className="bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center gap-3 group backdrop-blur-sm"
                >
                    <Briefcase className="w-8 h-8 group-hover:scale-110 transition-transform duration-200" />
                    <div className="text-center">
                        <div className="font-semibold text-lg">New Brief</div>
                        <div className="text-blue-100 text-sm">Research & Writing</div>
                    </div>
                </button>

                <button
                    onClick={() => setActiveModal('matter')}
                    className="bg-gradient-to-br from-violet-600 to-violet-700 hover:from-violet-700 hover:to-violet-800 text-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 flex flex-col items-center gap-3 group backdrop-blur-sm"
                >
                    <Gavel className="w-8 h-8 group-hover:scale-110 transition-transform duration-200" />
                    <div className="text-center">
                        <div className="font-semibold text-lg">Add Matter</div>
                        <div className="text-violet-100 text-sm">Litigation Tracker</div>
                    </div>
                </button>
            </div>

            {/* Secondary Actions (2-Grid) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <button
                    onClick={() => handleActionClick('invoice')}
                    className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl hover:bg-white/80 dark:hover:bg-slate-800/60 border border-slate-200/50 dark:border-white/5 p-4 rounded-xl transition-all duration-200 flex items-center gap-3 shadow-sm hover:shadow-md group"
                >
                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                        <FileText className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <div className="text-left">
                        <div className="font-medium text-slate-900 dark:text-white">Create Invoice</div>
                        <div className="text-slate-500 dark:text-slate-400 text-sm">Billing & Finance</div>
                    </div>
                </button>

                <button
                    onClick={() => handleActionClick('payment')}
                    className="bg-white/60 dark:bg-slate-800/40 backdrop-blur-xl hover:bg-white/80 dark:hover:bg-slate-800/60 border border-slate-200/50 dark:border-white/5 p-4 rounded-xl transition-all duration-200 flex items-center gap-3 shadow-sm hover:shadow-md group"
                >
                    <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg group-hover:bg-amber-200 dark:group-hover:bg-amber-900/50 transition-colors">
                        <DollarSign className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="text-left">
                        <div className="font-medium text-slate-900 dark:text-white">Record Payment</div>
                        <div className="text-slate-500 dark:text-slate-400 text-sm">Receipts & Tracking</div>
                    </div>
                </button>
            </div>

            {/* Client Picker Modal (Previous Logic Retained) */}
            {showClientPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-white/10 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200 ring-1 ring-black/5">
                        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-slate-800/50">
                            <h3 className="font-bold text-lg text-slate-900 dark:text-white">Select Client</h3>
                            <button onClick={() => setShowClientPicker(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-5">
                            <div className="relative mb-4 group">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border-transparent focus:bg-white dark:focus:bg-slate-900 border focus:border-blue-500/50 rounded-xl text-sm focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                                {filteredClients.length === 0 ? (
                                    <div className="text-center py-8">
                                        <p className="text-sm text-gray-500">No matching clients</p>
                                    </div>
                                ) : (
                                    filteredClients.map(client => (
                                        <button
                                            key={client.id}
                                            onClick={() => handleClientSelect(client)}
                                            className="w-full text-left p-3.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all duration-200 flex items-center justify-between group border border-transparent hover:border-blue-100 dark:hover:border-blue-800"
                                        >
                                            <div>
                                                <p className="font-semibold text-slate-700 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">{client.name}</p>
                                                {client.company && (
                                                    <p className="text-xs text-slate-500 group-hover:text-blue-600/70 dark:group-hover:text-blue-400/70 transition-colors">{client.company}</p>
                                                )}
                                            </div>
                                            <div className="h-6 w-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-x-2 group-hover:translate-x-0 transition-all">
                                                <ChevronRight size={14} />
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Application Modals */}
            <BriefUploadModal
                isOpen={activeModal === 'brief'}
                onClose={() => setActiveModal(null)}
                onSuccess={() => setActiveModal(null)}
                workspaceId={workspaceId}
            />
            <AddMatterModal
                isOpen={activeModal === 'matter'}
                onClose={() => setActiveModal(null)}
                workspaceId={workspaceId}
                userId={userId}
                onSuccess={() => { }}
            />
            {targetClientId && (
                <>
                    <InvoiceModal
                        isOpen={activeModal === 'invoice'}
                        onClose={() => setActiveModal(null)}
                        clientName={targetClientName}
                        clientId={targetClientId}
                        workspaceId={workspaceId}
                    />
                    <PaymentModal
                        isOpen={activeModal === 'payment'}
                        onClose={() => setActiveModal(null)}
                        clientName={targetClientName}
                        clientId={targetClientId}
                    />
                </>
            )}
        </div>
    );
}
