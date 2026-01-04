"use client";

import { useState } from 'react';
import {
    Plus, Gavel, FileText, DollarSign,
    Briefcase, Users, LayoutDashboard,
    ChevronRight, CreditCard, X, Search
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

    // For Invoice/Payment, we first need to pick a client
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

        // Switch from picker to actual modal
        const nextModal = showClientPicker; // 'invoice' or 'payment'
        setShowClientPicker(null);
        setActiveModal(nextModal);
    };

    const filteredClients = clients.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.company && c.company.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="w-full mb-8">
            {/* Quick Action Bar */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <button
                    onClick={() => setActiveModal('brief')}
                    className="relative overflow-hidden flex flex-col items-center justify-center p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-blue-500/20 shadow-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 relative z-10">
                        <Briefcase className="h-7 w-7 text-white" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-lg relative z-10">New Brief</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 relative z-10">Research & Writing</span>
                </button>

                <button
                    onClick={() => setActiveModal('matter')}
                    className="relative overflow-hidden flex flex-col items-center justify-center p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 shadow-purple-500/20 shadow-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 relative z-10">
                        <Gavel className="h-7 w-7 text-white" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-lg relative z-10">Add Matter</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 relative z-10">Litigation Tracker</span>
                </button>

                <button
                    onClick={() => handleActionClick('invoice')}
                    className="relative overflow-hidden flex flex-col items-center justify-center p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/20 shadow-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 relative z-10">
                        <FileText className="h-7 w-7 text-white" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-lg relative z-10">Create Invoice</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 relative z-10">Billing & Finance</span>
                </button>

                <button
                    onClick={() => handleActionClick('payment')}
                    className="relative overflow-hidden flex flex-col items-center justify-center p-6 rounded-2xl border border-white/20 dark:border-white/10 shadow-lg hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 group bg-white/60 dark:bg-slate-900/40 backdrop-blur-xl"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                    <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 shadow-amber-500/20 shadow-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300 relative z-10">
                        <DollarSign className="h-7 w-7 text-white" />
                    </div>
                    <span className="font-bold text-slate-800 dark:text-slate-100 text-lg relative z-10">Record Payment</span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1 relative z-10">Receipts & Tracking</span>
                </button>
            </div>

            {/* Client Picker Modal */}
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
                                        <p className="text-sm text-gray-500">No clients found matching "{searchTerm}"</p>
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

            {/* App Modals */}
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
