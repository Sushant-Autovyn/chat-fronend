import React, { useState, useEffect } from 'react';
import { customerService, ticketService, Customer, Ticket } from '../services/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { useNotification } from '../notifications/NotificationProvider';
import { Search, Ban, UserCheck, FileText, History, ShieldAlert, Check } from 'lucide-react';

const CustomerManagement: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'blocked'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Notes Modal state
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [selectedCustomerForNotes, setSelectedCustomerForNotes] = useState<Customer | null>(null);
  const [customerNotes, setCustomerNotes] = useState('');
  
  // History Modal state
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);
  const [customerTickets, setCustomerTickets] = useState<Ticket[]>([]);

  // Success alert
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { confirm, success: notifySuccess } = useNotification();

  useEffect(() => {
    loadCustomerData();
  }, []);

  const loadCustomerData = async () => {
    try {
      const customerList = customerService.getCustomers();
      const ticketList = await ticketService.getTickets();
      setTickets(ticketList);

      // Dynamically enrich customer list with any new tickets that have arrived
      // in the database but might not be in our pre-populated customer table
      ticketList.forEach(ticket => {
        customerService.addOrUpdateCustomerFromTicket(ticket);
      });

      // Reload enriched list
      setCustomers(customerService.getCustomers());
    } catch (err) {
      console.error('Failed to load customers:', err);
    }
  };

  // Filter customers
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = 
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || customer.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Pagination logic
  const paginatedCustomers = filteredCustomers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  // Block/Unblock customer
  const handleToggleBlock = async (customer: Customer) => {
    const nextStatus = customer.status === 'active' ? 'blocked' : 'active';
    const verb = nextStatus === 'blocked' ? 'blocked' : 'unblocked';
    
    const confirmed = await confirm(`Are you sure you want to set customer "${customer.name}" (${customer.email}) to ${nextStatus}?`, {
      title: 'Confirm status change',
      confirmText: 'Yes, proceed',
      cancelText: 'Cancel',
      intent: 'danger'
    });

    if (!confirmed) return;

    try {
      customerService.updateCustomerStatus(customer.email, nextStatus);
      notifySuccess(`Customer ${customer.name} was successfully ${verb}.`);
      loadCustomerData();
    } catch (err) {
      console.error('Error toggling block status:', err);
    }
  };

  // Open Notes Modal
  const handleOpenNotes = (customer: Customer) => {
    setSelectedCustomerForNotes(customer);
    setCustomerNotes(customer.notes);
    setNotesModalOpen(true);
  };

  // Save Notes
  const handleSaveNotes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomerForNotes) return;

    try {
      customerService.updateCustomerNotes(selectedCustomerForNotes.email, customerNotes);
      setSuccessMessage(`Updated notes for ${selectedCustomerForNotes.name}.`);
      loadCustomerData();
      setNotesModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error saving customer notes:', err);
    }
  };

  // Open History Modal
  const handleOpenHistory = (customer: Customer) => {
    setSelectedCustomerForHistory(customer);
    const relatedTickets = tickets.filter(t => t.email.toLowerCase() === customer.email.toLowerCase());
    setCustomerTickets(relatedTickets);
    setHistoryModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold text-foreground">Customer Relationship Directory</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          View customer metrics, append notes for live support, and restrict/block abusive users.
        </p>
      </div>

      {/* Success alert */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* Filtering Toolbar */}
      <div className="grid gap-4 sm:grid-cols-3 bg-card p-4 rounded-2xl border border-border">
        {/* Search */}
        <div className="relative col-span-1 sm:col-span-2">
          <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-muted-foreground pointer-events-none">
            <Search className="h-4.5 w-4.5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search customers by name or email address..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary placeholder-muted-foreground transition-all"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground transition-all cursor-pointer"
        >
          <option value="all">All Customer Statuses</option>
          <option value="active">Active Accounts</option>
          <option value="blocked">Blocked Accounts</option>
        </select>
      </div>

      {/* Customers Table */}
      <Table
        headers={['Customer Name', 'Email Address', 'Total Chat Sessions', 'Last Active Timestamp', 'Account Status', 'Actions']}
        totalItems={filteredCustomers.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isEmpty={filteredCustomers.length === 0}
      >
        {paginatedCustomers.map((customer) => (
          <tr key={customer.email} className="hover:bg-muted/10 transition-colors">
            {/* Customer Name */}
            <td className="px-6 py-4.5 font-semibold text-foreground">
              {customer.name}
            </td>

            {/* Email */}
            <td className="px-6 py-4.5 text-muted-foreground">
              {customer.email}
            </td>

            {/* Total Chats */}
            <td className="px-6 py-4.5 text-foreground font-bold pl-12">
              {customer.totalChats}
            </td>

            {/* Last Active */}
            <td className="px-6 py-4.5 text-xs text-muted-foreground">
              {new Date(customer.lastActive).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </td>

            {/* Status */}
            <td className="px-6 py-4.5">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold leading-none ${
                customer.status === 'active'
                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                  : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full ${customer.status === 'active' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                {customer.status === 'active' ? 'Active' : 'Blocked'}
              </span>
            </td>

            {/* Actions */}
            <td className="px-6 py-4.5">
              <div className="flex items-center gap-2">
                {/* Notes */}
                <button
                  onClick={() => handleOpenNotes(customer)}
                  className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit customer notes"
                >
                  <FileText className="h-4.5 w-4.5" />
                </button>

                {/* View history */}
                <button
                  onClick={() => handleOpenHistory(customer)}
                  className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="View chat history"
                >
                  <History className="h-4.5 w-4.5" />
                </button>

                {/* Block Toggle */}
                <button
                  onClick={() => handleToggleBlock(customer)}
                  className={`rounded-lg p-1.5 transition-colors ${
                    customer.status === 'active'
                      ? 'hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600'
                      : 'hover:bg-emerald-500/10 text-muted-foreground hover:text-emerald-600'
                  }`}
                  title={customer.status === 'active' ? 'Block customer' : 'Unblock customer'}
                >
                  {customer.status === 'active' ? (
                    <Ban className="h-4.5 w-4.5" />
                  ) : (
                    <UserCheck className="h-4.5 w-4.5" />
                  )}
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {/* Edit Notes Modal */}
      <Modal
        isOpen={notesModalOpen}
        onClose={() => setNotesModalOpen(false)}
        title={selectedCustomerForNotes ? `Customer Notes: ${selectedCustomerForNotes.name}` : 'Customer Notes'}
      >
        <form onSubmit={handleSaveNotes} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
              Notes & Background Context
            </label>
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder="Add important details about this customer (e.g. key business tier, preferences, past complaints, etc.). This will be displayed to agents during live chats."
              rows={5}
              className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground leading-relaxed"
            />
          </div>

          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setNotesModalOpen(false)}
              className="px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted text-muted-foreground transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.98]"
            >
              Save Notes
            </button>
          </div>
        </form>
      </Modal>

      {/* View Customer History Modal */}
      <Modal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={selectedCustomerForHistory ? `Tickets Archive: ${selectedCustomerForHistory.name}` : 'Tickets Archive'}
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            List of all tickets submitted by <b className="text-foreground">{selectedCustomerForHistory?.email}</b>.
          </p>

          <div className="max-h-96 overflow-y-auto border border-border rounded-xl divide-y divide-border/60 scrollbar-thin">
            {customerTickets.map((ticket) => (
              <div key={ticket._id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-muted/10 transition-colors">
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-bold text-sm text-foreground">{ticket.issue}</span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      ticket.status === 'pending'
                        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {ticket.status}
                    </span>
                  </div>
                  <span className="block text-xs text-muted-foreground mt-1">
                    Submitted: {new Date(ticket.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
                  </span>
                </div>
                
                <span className="text-xs font-semibold px-3 py-1 bg-muted border border-border/80 text-muted-foreground rounded-lg">
                  #{ticket._id.substring(ticket._id.length - 6)}
                </span>
              </div>
            ))}

            {customerTickets.length === 0 && (
              <div className="p-6 text-center text-xs text-muted-foreground">
                No tickets registered for this customer email.
              </div>
            )}
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <button
              type="button"
              onClick={() => setHistoryModalOpen(false)}
              className="px-4 py-2 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.98]"
            >
              Close History
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CustomerManagement;
