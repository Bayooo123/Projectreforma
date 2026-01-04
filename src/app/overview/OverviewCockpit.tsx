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
                    className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group text-center"
                >
                    <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center mb-3 group-hover:bg-blue-100 dark:group-hover:bg-blue-900/30 transition-colors">
                        <Briefcase className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">New Brief</span>
                    <span className="text-xs text-slate-500 mt-1">Research & Writing</span>
                </button>

                <button
                    onClick={() => setActiveModal('matter')}
                    className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group text-center"
                >
                    <div className="h-12 w-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center mb-3 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                        <Gavel className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">Add Matter</span>
                    <span className="text-xs text-slate-500 mt-1">Litigation Tracker</span>
                </button>

                <button
                    onClick={() => handleActionClick('invoice')}
                    className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group text-center"
                >
                    <div className="h-12 w-12 rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center mb-3 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                        <FileText className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">Create Invoice</span>
                    <span className="text-xs text-slate-500 mt-1">Billing & Finance</span>
                </button>

                <button
                    onClick={() => handleActionClick('payment')}
                    className="flex flex-col items-center justify-center p-6 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group text-center"
                >
                    <div className="h-12 w-12 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-3 group-hover:bg-amber-100 dark:group-hover:bg-amber-900/30 transition-colors">
                        <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">Record Payment</span>
                    <span className="text-xs text-slate-500 mt-1">Receipts & Tracking</span>
                </button>
            </div>

            {/* Client Picker Modal */}
            {showClientPicker && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center">
                            <h3 className="font-semibold text-lg text-slate-900 dark:text-white">Select Client</h3>
                            <button onClick={() => setShowClientPicker(null)} className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4">
                            <div className="relative mb-4">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search clients..."
                                    className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border-none rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>

                            <div className="max-h-60 overflow-y-auto space-y-1 custom-scrollbar">
                                {filteredClients.length === 0 ? (
                                    <p className="text-center text-sm text-gray-500 py-4">No clients found</p>
                                ) : (
                                    filteredClients.map(client => (
                                        <button
                                            key={client.id}
                                            onClick={() => handleClientSelect(client)}
                                            className="w-full text-left p-3 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors flex items-center justify-between group"
                                        >
                                            <div>
                                                <p className="font-medium text-slate-900 dark:text-slate-200">{client.name}</p>
                                                {client.company && (
                                                    <p className="text-xs text-slate-500">{client.company}</p>
                                                )}
                                            </div>
                                            <ChevronRight size={16} className="text-gray-400 group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all" />
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
                onSuccess={() => { }} // Could trigger refresh
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
