import { useEffect, useMemo, useState } from 'react';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { ChevronDown, Copy, Cpu, Plus, Save, Search, Trash2, X } from 'lucide-react';

const CATEGORY_ORDER = [
  'Marketing Automation & Adobe Stack',
  'Data & Analytics / CDP',
  'Core Engineering & Development',
  'Automation, Testing & Validation',
  'Infrastructure & Operations',
  'Enterprise Tools & Business Systems',
  'Semiconductor & Hardware',
  'Misc / Other',
];

const CATEGORY_ACCENTS = {
  'Marketing Automation & Adobe Stack': 'text-blue-600',
  'Data & Analytics / CDP': 'text-sky-500',
  'Core Engineering & Development': 'text-emerald-500',
  'Automation, Testing & Validation': 'text-amber-500',
  'Infrastructure & Operations': 'text-teal-500',
  'Enterprise Tools & Business Systems': 'text-rose-500',
  'Semiconductor & Hardware': 'text-violet-500',
  'Misc / Other': 'text-slate-500',
};

const categorySortIndex = new Map(CATEGORY_ORDER.map((category, index) => [category, index]));

const sortTechnologies = (items = []) => {
  return [...items].sort((left, right) => {
    const categoryDiff =
      (categorySortIndex.get(left.category) ?? Number.MAX_SAFE_INTEGER) -
      (categorySortIndex.get(right.category) ?? Number.MAX_SAFE_INTEGER);

    if (categoryDiff !== 0) return categoryDiff;

    const sortOrderDiff = (left.sortOrder ?? 0) - (right.sortOrder ?? 0);
    if (sortOrderDiff !== 0) return sortOrderDiff;

    return left.name.localeCompare(right.name);
  });
};

const normalizeQueryValue = (value = '') => value.trim().toLowerCase();

const AvailableTechnologiesPage = ({ canManage = false }) => {
  const [technologies, setTechnologies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTechnology, setSelectedTechnology] = useState(null);
  const [contentDraft, setContentDraft] = useState('');
  const [creating, setCreating] = useState(false);
  const [savingContent, setSavingContent] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    category: CATEGORY_ORDER[0],
  });

  useEffect(() => {
    fetchTechnologies();
  }, []);

  const fetchTechnologies = async () => {
    try {
      const res = await api.get('/admin/available-technologies');
      setTechnologies(sortTechnologies(res.data || []));
    } catch (error) {
      toast.error('Failed to load available technologies');
    } finally {
      setLoading(false);
    }
  };

  const closeCreateModal = (force = false) => {
    if (creating && !force) return;
    setShowCreateModal(false);
    setForm({ name: '', category: CATEGORY_ORDER[0] });
  };

  const openTechnologyContent = (technology) => {
    setSelectedTechnology(technology);
    setContentDraft(technology.content || '');
  };

  const closeContentModal = () => {
    if (savingContent) return;
    setSelectedTechnology(null);
    setContentDraft('');
  };

  const handleCopyContent = async () => {
    try {
      await navigator.clipboard.writeText(contentDraft || '');
      toast.success('Technology content copied');
    } catch {
      toast.error('Failed to copy content');
    }
  };

  const handleSaveContent = async () => {
    if (!canManage || !selectedTechnology) return;

    setSavingContent(true);
    try {
      const res = await api.patch(`/admin/available-technologies/${selectedTechnology.id}`, {
        content: contentDraft,
      });
      setTechnologies((prev) => sortTechnologies(prev.map((technology) => (
        technology.id === selectedTechnology.id ? { ...technology, ...res.data } : technology
      ))));
      setSelectedTechnology((prev) => ({ ...prev, ...res.data }));
      setContentDraft(res.data.content || '');
      toast.success('Technology content saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save content');
    } finally {
      setSavingContent(false);
    }
  };

  const handleCreateTechnology = async (e) => {
    e.preventDefault();

    if (!canManage) return;

    if (!form.name.trim()) {
      toast.error('Technology name is required');
      return;
    }

    setCreating(true);
    try {
      const res = await api.post('/admin/available-technologies', {
        name: form.name,
        category: form.category,
      });

      setTechnologies((prev) => sortTechnologies([...prev, res.data]));
      toast.success('Technology created successfully');
      closeCreateModal(true);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create technology');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteTechnology = async (technology) => {
    if (!canManage) return;

    const confirmed = window.confirm(`Delete ${technology.name}?`);
    if (!confirmed) return;

    setDeletingId(technology.id);
    try {
      await api.delete(`/admin/available-technologies/${technology.id}`);
      setTechnologies((prev) => prev.filter((item) => item.id !== technology.id));
      toast.success('Technology deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete technology');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredTechnologies = useMemo(() => {
    const searchValue = normalizeQueryValue(search);

    return technologies.filter((technology) => {
      const matchesCategory = categoryFilter === 'all' || technology.category === categoryFilter;
      const matchesSearch =
        !searchValue ||
        technology.name.toLowerCase().includes(searchValue) ||
        technology.category.toLowerCase().includes(searchValue);

      return matchesCategory && matchesSearch;
    });
  }, [categoryFilter, search, technologies]);

  const groupedTechnologies = useMemo(() => {
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: filteredTechnologies.filter((technology) => technology.category === category),
    })).filter((group) => group.items.length > 0);
  }, [filteredTechnologies]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h1 className="bg-gradient-to-r from-blue-800 via-blue-600 to-sky-500 bg-clip-text text-[20px] font-bold tracking-tight text-transparent">
              Available Technologies
            </h1>
            <p className="mt-0.5 text-[11px] text-slate-500 sm:text-xs">
              {canManage
                ? 'Manage the technology catalogue available across the platform.'
                : 'Browse the technology catalogue available across the platform.'}
            </p>
          </div>

          {canManage && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Plus size={13} />
              Add technology
            </button>
          )}
        </div>

        <div className="mt-3.5 grid gap-2 xl:grid-cols-[minmax(0,1.35fr)_230px]">
          <label className="relative block">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by technology or category"
              className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            />
          </label>

          <label className="relative block">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 w-full appearance-none rounded-lg border border-slate-200 bg-white px-3 pr-9 text-[13px] text-slate-900 outline-none transition-all focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
            >
              <option value="all">All categories</option>
              {CATEGORY_ORDER.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
          </label>
        </div>
      </div>

      {groupedTechnologies.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-10 text-center shadow-sm">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <Cpu size={20} />
          </div>
          <h2 className="mt-3 text-base font-semibold text-slate-900">No technologies found</h2>
          <p className="mt-1.5 text-xs text-slate-500">Adjust your search or category filter to see more results.</p>
        </div>
      ) : (
        groupedTechnologies.map(({ category, items }) => (
          <section key={category} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 px-4 py-3">
              <h2 className="text-[15px] font-bold tracking-tight text-slate-950">
                {category}{' '}
                <span className={`text-[14px] ${CATEGORY_ACCENTS[category] || 'text-blue-600'}`}>
                  ({items.length})
                </span>
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-2 p-3.5 md:grid-cols-2 xl:grid-cols-3">
              {items.map((technology) => (
                <article
                  key={technology.id}
                  onClick={() => openTechnologyContent(technology)}
                  className="flex min-h-[48px] cursor-pointer items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 transition-all hover:border-blue-200 hover:shadow-sm"
                >
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[13px] font-bold text-slate-900">{technology.name}</h3>
                    <p className="mt-0.5 truncate text-[11px] font-medium text-slate-400">
                      {technology.content ? 'Content available' : canManage ? 'Click to add content' : 'No content yet'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="min-w-[14px] text-right text-[13px] font-semibold text-slate-500">
                      {technology.usageCount ?? 0}
                    </span>

                    {canManage && (
                      <button
                        onClick={(event) => {
                          event.stopPropagation();
                          handleDeleteTechnology(technology);
                        }}
                        disabled={deletingId === technology.id}
                        className="rounded-md p-0.5 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                        title={`Delete ${technology.name}`}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      {showCreateModal && canManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm">
          <form
            onSubmit={handleCreateTechnology}
            className="w-full max-w-[720px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-4 py-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-slate-400">Available Technologies</p>
                <h2 className="mt-1 text-[16px] leading-none font-bold tracking-tight text-slate-950">Add technology</h2>
              </div>

              <button
                type="button"
                onClick={closeCreateModal}
                className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <X size={14} />
              </button>
            </div>

            <div className="px-4 py-3.5">
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-slate-800">Technology name</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter technology name"
                    className="h-9 w-full rounded-lg border border-slate-200 px-3 text-[13px] text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:ring-4 focus:ring-blue-100"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[13px] font-semibold text-slate-800">Category</label>
                  <div className="relative">
                    <select
                      value={form.category}
                      onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value }))}
                      className="h-9 w-full appearance-none rounded-lg border border-slate-300 px-3 pr-8 text-[13px] text-slate-900 outline-none transition-all focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    >
                      {CATEGORY_ORDER.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={13} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-4 py-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCreateModal}
                className="inline-flex min-w-[94px] items-center justify-center rounded-lg bg-blue-50 px-3 py-1.5 text-[12px] font-semibold text-blue-700 transition-colors hover:bg-blue-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="inline-flex min-w-[138px] items-center justify-center rounded-lg bg-blue-600 px-3.5 py-1.5 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {creating ? 'Creating...' : 'Create technology'}
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedTechnology && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6 backdrop-blur-sm" onClick={closeContentModal}>
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">
                  {canManage ? 'Edit Technology Content' : 'Technology Content'}
                </p>
                <h2 className="mt-1 truncate text-lg font-bold tracking-tight text-slate-950">{selectedTechnology.name}</h2>
                <p className="mt-1 text-xs font-medium text-slate-500">{selectedTechnology.category}</p>
              </div>
              <button
                type="button"
                onClick={closeContentModal}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm transition-colors hover:bg-blue-700"
              >
                <X size={15} />
              </button>
            </div>

            <div className="min-h-0 flex-1 p-5">
              <textarea
                value={contentDraft}
                onChange={(event) => setContentDraft(event.target.value)}
                readOnly={!canManage}
                placeholder={canManage ? 'Write, paste, or edit the content for this technology...' : 'No content has been added for this technology yet.'}
                className={`min-h-[420px] w-full resize-none rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition-all placeholder:text-slate-400 focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100 ${!canManage ? 'cursor-text' : ''}`}
              />
            </div>

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={handleCopyContent}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
              >
                <Copy size={15} />
                Copy
              </button>
              {canManage && (
                <button
                  type="button"
                  onClick={handleSaveContent}
                  disabled={savingContent}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Save size={15} />
                  {savingContent ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AvailableTechnologiesPage;