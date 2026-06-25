import React, { useState, useEffect } from 'react';
import { kbService, FAQ } from '../services/api';
import Table from '../components/Table';
import Modal from '../components/Modal';
import { useNotification } from '../notifications/NotificationProvider';
import { Search, BookOpen, Plus, Edit2, Trash2, ShieldAlert } from 'lucide-react';

const KnowledgeBase: React.FC = () => {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;

  // Modal forms state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFAQ, setEditingFAQ] = useState<FAQ | null>(null);

  // Form fields
  const [formQuestion, setFormQuestion] = useState('');
  const [formAnswer, setFormAnswer] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { confirm, error: notifyError } = useNotification();

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = () => {
    setFaqs(kbService.getFAQs());
  };

  // Extract unique categories for filter dropdown
  const categories = Array.from(new Set(faqs.map(f => f.category)));

  // Filter FAQs
  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || faq.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Pagination logic
  const paginatedFAQs = filteredFAQs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, categoryFilter]);

  // Open Modal for Add
  const handleOpenAdd = () => {
    setEditingFAQ(null);
    setFormQuestion('');
    setFormAnswer('');
    setFormCategory('Support');
    setFormError(null);
    setModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEdit = (faq: FAQ) => {
    setEditingFAQ(faq);
    setFormQuestion(faq.question);
    setFormAnswer(faq.answer);
    setFormCategory(faq.category);
    setFormError(null);
    setModalOpen(true);
  };

  // Save FAQ
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    if (!formQuestion || !formAnswer || !formCategory) {
      setFormError('All fields are required.');
      return;
    }

    try {
      if (editingFAQ) {
        kbService.updateFAQ(editingFAQ.id, formQuestion, formAnswer, formCategory);
        setSuccessMessage('FAQ article updated successfully.');
      } else {
        kbService.addFAQ(formQuestion, formAnswer, formCategory);
        setSuccessMessage('New FAQ article registered.');
      }
      
      loadFAQs();
      setModalOpen(false);
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setFormError(err.message || 'Failed to save FAQ.');
    }
  };

  // Delete FAQ
  const handleDelete = async (id: string, question: string) => {
    const brief = question.length > 25 ? question.substring(0, 25) + '...' : question;
    const confirmed = await confirm(`Are you sure you want to delete FAQ: "${brief}"?`, {
      title: 'Confirm delete FAQ',
      confirmText: 'Delete FAQ',
      cancelText: 'Cancel',
      intent: 'danger'
    });

    if (!confirmed) return;

    try {
      kbService.deleteFAQ(id);
      loadFAQs();
      setSuccessMessage('FAQ article deleted.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      notifyError(err.message || 'Failed to delete FAQ.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-foreground">Knowledge Base FAQ Directory</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Maintain the repository of questions and answers utilized by the AI chatbot assistant to auto-reply to users.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-2 rounded-xl bg-primary text-white px-4 py-3 text-sm font-semibold hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.98] shrink-0"
        >
          <Plus className="h-4.5 w-4.5" />
          <span>Add FAQ Article</span>
        </button>
      </div>

      {/* Success alert */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* Search and Filters */}
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
            placeholder="Search FAQs by question keywords or answers..."
            className="w-full pl-10 pr-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary placeholder-muted-foreground transition-all"
          />
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3.5 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground transition-all cursor-pointer"
        >
          <option value="all">All Categories</option>
          {categories.map((cat, idx) => (
            <option key={idx} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* FAQ Table */}
      <Table
        headers={['Question', 'Answer Excerpt', 'Category', 'Actions']}
        totalItems={filteredFAQs.length}
        itemsPerPage={itemsPerPage}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        isEmpty={filteredFAQs.length === 0}
      >
        {paginatedFAQs.map((faq) => (
          <tr key={faq.id} className="hover:bg-muted/10 transition-colors">
            {/* Question */}
            <td className="px-6 py-4.5 font-bold text-foreground max-w-[250px] truncate">
              {faq.question}
            </td>

            {/* Answer */}
            <td className="px-6 py-4.5 text-muted-foreground max-w-[350px] truncate">
              {faq.answer}
            </td>

            {/* Category */}
            <td className="px-6 py-4.5">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                {faq.category}
              </span>
            </td>

            {/* Actions */}
            <td className="px-6 py-4.5">
              <div className="flex items-center gap-2">
                {/* Edit */}
                <button
                  onClick={() => handleOpenEdit(faq)}
                  className="rounded-lg p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title="Edit FAQ article"
                >
                  <Edit2 className="h-4.5 w-4.5" />
                </button>

                {/* Delete */}
                <button
                  onClick={() => handleDelete(faq.id, faq.question)}
                  className="rounded-lg p-1.5 hover:bg-rose-500/10 text-muted-foreground hover:text-rose-600 transition-colors"
                  title="Delete FAQ article"
                >
                  <Trash2 className="h-4.5 w-4.5" />
                </button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {/* Add/Edit FAQ Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingFAQ ? 'Modify FAQ Article' : 'Add FAQ Article'}
        size="lg"
      >
        <form onSubmit={handleSave} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-start gap-2.5 animate-fade-in">
              <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {/* Question */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Question *</label>
            <input
              type="text"
              required
              value={formQuestion}
              onChange={(e) => setFormQuestion(e.target.value)}
              placeholder="e.g. How do I reset my subscription?"
              className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground font-semibold"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Category *</label>
            <input
              type="text"
              required
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              placeholder="e.g. Billing, Technical, General"
              className="w-full px-4 py-2.5 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground"
            />
          </div>

          {/* Answer */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Detailed Answer *</label>
            <textarea
              required
              value={formAnswer}
              onChange={(e) => setFormAnswer(e.target.value)}
              placeholder="Provide the exact answer that the chatbot will show to the user..."
              rows={6}
              className="w-full px-4 py-3 bg-muted/30 border border-border rounded-xl text-sm focus:outline-none focus:border-primary text-foreground leading-relaxed"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted text-muted-foreground transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-semibold hover:bg-primary/95 transition-all shadow-glow-primary active:scale-[0.98]"
            >
              {editingFAQ ? 'Save FAQ' : 'Register FAQ'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default KnowledgeBase;
