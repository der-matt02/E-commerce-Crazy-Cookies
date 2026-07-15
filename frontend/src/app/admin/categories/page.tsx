'use client';

import { useEffect, useState } from 'react';
import { apiErrorMessage } from '@/lib/error';
import { categoriesApi } from '@/features/products/api/products-api';
import type { Category } from '@/types/product.types';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    imageUrl: '',
    isActive: true,
    order: 0,
  });

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      setLoading(true);
      const data = await categoriesApi.getAll();
      setCategories(data);
    } catch (err) {
      setError('Error al cargar categorías');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      imageUrl: '',
      isActive: true,
      order: categories.length,
    });
    setShowModal(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      imageUrl: category.imageUrl || '',
      isActive: category.isActive,
      order: category.order,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar la categoría "${name}"?`)) {
      return;
    }

    try {
      await categoriesApi.delete(id);
      await loadCategories();
    } catch (err) {
      alert(apiErrorMessage(err, 'Error al eliminar categoría'));
      console.error(err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, formData);
      } else {
        await categoriesApi.create(formData);
      }

      setShowModal(false);
      await loadCategories();
    } catch (err) {
      alert(apiErrorMessage(err, 'Error al guardar categoría'));
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseInt(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));

      // Auto-generate slug from name
      if (name === 'name' && !editingCategory) {
        const slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        setFormData((prev) => ({ ...prev, slug }));
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-ink-light">Cargando categorías...</div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-card bg-error/10 p-4 text-error">{error}</div>;
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold">Categorías</h1>
        <button
          onClick={handleCreate}
          className="rounded-card bg-accent px-4 py-2 font-medium text-white hover:bg-accent-dark"
        >
          + Nueva Categoría
        </button>
      </div>

      {/* Categories Table */}
      <div className="rounded-card bg-white shadow-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-cream">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Nombre</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Slug</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Productos</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Estado</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-ink">Orden</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-ink">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-white">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-ink-light">
                  No hay categorías registradas
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id} className="hover:bg-cream">
                  <td className="px-6 py-4">
                    <div className="font-medium text-ink">{category.name}</div>
                    {category.description && (
                      <div className="mt-1 text-sm text-ink-light">{category.description}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-light">{category.slug}</td>
                  <td className="px-6 py-4 text-sm text-ink-light">
                    {category._count?.products || 0}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        category.isActive ? 'bg-success/15 text-success-dark' : 'bg-cream text-ink'
                      }`}
                    >
                      {category.isActive ? 'Activa' : 'Inactiva'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-ink-light">{category.order}</td>
                  <td className="px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => handleEdit(category)}
                      className="mr-3 text-accent hover:text-accent-dark"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(category.id, category.name)}
                      className="text-error hover:text-error-dark"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-2xl rounded-card bg-white p-6 shadow-xl">
            <h2 className="mb-6 text-2xl font-bold">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">Nombre *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Slug */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">Slug *</label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    required
                    pattern="[a-z0-9-]+"
                    className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-ink-light">
                    Solo letras minúsculas, números y guiones
                  </p>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">Descripción</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                  />
                </div>

                {/* Image URL */}
                <div>
                  <label className="mb-1 block text-sm font-medium text-ink">URL de Imagen</label>
                  <input
                    type="url"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Order */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">Orden</label>
                    <input
                      type="number"
                      name="order"
                      value={formData.order}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full rounded-card border border-border px-3 py-2 focus:border-accent focus:outline-none"
                    />
                  </div>

                  {/* Active Status */}
                  <div>
                    <label className="mb-1 block text-sm font-medium text-ink">Estado</label>
                    <div className="flex h-10 items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-border text-accent focus:ring-accent"
                      />
                      <span className="ml-2 text-sm text-ink">Activa</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-card border border-border px-4 py-2 text-ink hover:bg-cream"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-card bg-accent px-4 py-2 text-white hover:bg-accent-dark"
                >
                  {editingCategory ? 'Guardar Cambios' : 'Crear Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
