'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { apiErrorMessage } from '@/lib/error';
import { productsApi, categoriesApi } from '@/features/products/api/products-api';
import type { Product, ProductImage, Category } from '@/types/product.types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageProduct, setImageProduct] = useState<Product | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    price: 0,
    categoryId: '',
    isActive: true,
    stockAvailable: 0,
    stockMinimum: 5,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsData, categoriesData] = await Promise.all([
        productsApi.getAll(),
        categoriesApi.getAll(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      setError('Error al cargar datos');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      price: 0,
      categoryId: categories[0]?.id || '',
      isActive: true,
      stockAvailable: 0,
      stockMinimum: 5,
    });
    setShowModal(true);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.price,
      categoryId: product.categoryId,
      isActive: product.isActive,
      stockAvailable: product.inventory?.stockAvailable || 0,
      stockMinimum: product.inventory?.stockMinimum || 5,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de eliminar el producto "${name}"?`)) return;
    try {
      await productsApi.delete(id);
      await loadData();
    } catch (err) {
      alert(apiErrorMessage(err, 'Error al eliminar producto'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingProduct) {
        await productsApi.update(editingProduct.id, formData);
      } else {
        await productsApi.create(formData);
      }
      setShowModal(false);
      await loadData();
    } catch (err) {
      alert(apiErrorMessage(err, 'Error al guardar producto'));
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
    } else if (type === 'number') {
      setFormData((prev) => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
      if (name === 'name' && !editingProduct) {
        const slug = value
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        setFormData((prev) => ({ ...prev, slug }));
      }
    }
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!imageProduct || !e.target.files?.[0]) return;
    const file = e.target.files[0];
    try {
      setUploadingImage(true);
      const newImage = await productsApi.uploadImage(imageProduct.id, file);
      setImageProduct((prev) =>
        prev ? { ...prev, images: [...(prev.images ?? []), newImage] } : prev
      );
      await loadData();
    } catch (err) {
      alert(apiErrorMessage(err, 'Error al subir imagen'));
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (image: ProductImage) => {
    if (!imageProduct) return;
    if (!confirm('¿Eliminar esta imagen?')) return;
    try {
      await productsApi.deleteImage(imageProduct.id, image.id);
      setImageProduct((prev) =>
        prev ? { ...prev, images: prev.images?.filter((img) => img.id !== image.id) } : prev
      );
      await loadData();
    } catch (err) {
      alert(apiErrorMessage(err, 'Error al eliminar imagen'));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Cargando productos...</div>
      </div>
    );
  }

  if (error) {
    return <div className="rounded-lg bg-red-50 p-4 text-red-600">{error}</div>;
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-4xl font-bold">Productos</h1>
        <button
          onClick={handleCreate}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          + Nuevo Producto
        </button>
      </div>

      <div className="rounded-lg bg-white shadow">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Producto</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Categoría</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Precio</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Stock</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Imágenes</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Estado</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {products.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No hay productos registrados
                </td>
              </tr>
            ) : (
              products.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      {product.images && product.images.length > 0 ? (
                        <Image
                          src={`${API_URL}${product.images[0].url}`}
                          alt={product.images[0].alt ?? product.name}
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded bg-gray-200" />
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        <div className="text-sm text-gray-500">{product.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {product.category?.name || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    ${product.price.toLocaleString('es-CO')}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div>{product.inventory?.stockAvailable || 0} disponibles</div>
                    {product.inventory &&
                      product.inventory.stockAvailable < product.inventory.stockMinimum && (
                        <div className="text-red-600">⚠️ Stock bajo</div>
                      )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {product.images?.length ?? 0} foto(s)
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${
                        product.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {product.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="space-x-3 px-6 py-4 text-right text-sm">
                    <button
                      onClick={() => setImageProduct(product)}
                      className="text-purple-600 hover:text-purple-800"
                    >
                      Imágenes
                    </button>
                    <button
                      onClick={() => handleEdit(product)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(product.id, product.name)}
                      className="text-red-600 hover:text-red-800"
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

      {/* Image Management Modal */}
      {imageProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-xl font-bold">Imágenes — {imageProduct.name}</h2>
              <button
                onClick={() => setImageProduct(null)}
                className="text-2xl leading-none text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <div className="p-6">
              <div className="mb-6">
                {!imageProduct.images || imageProduct.images.length === 0 ? (
                  <p className="text-sm text-gray-500">Este producto no tiene imágenes aún.</p>
                ) : (
                  <div className="grid grid-cols-3 gap-4">
                    {imageProduct.images.map((img) => (
                      <div key={img.id} className="group relative">
                        <Image
                          src={`${API_URL}${img.url}`}
                          alt={img.alt ?? ''}
                          width={200}
                          height={128}
                          style={{ width: '100%', height: '8rem', objectFit: 'cover' }}
                          className="rounded-lg"
                        />
                        <button
                          onClick={() => handleDeleteImage(img)}
                          className="absolute right-2 top-2 hidden rounded-full bg-red-600 px-2 py-0.5 text-xs text-white group-hover:block"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="mb-3 text-sm font-medium text-gray-700">Subir nueva imagen</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleUploadImage}
                  disabled={uploadingImage}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                />
                {uploadingImage && <p className="mt-2 text-sm text-gray-500">Subiendo imagen...</p>}
                <p className="mt-1 text-xs text-gray-400">Máximo 5 MB. JPG, PNG, WEBP.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-3xl rounded-lg bg-white p-6 shadow-xl">
            <h2 className="mb-6 text-2xl font-bold">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>

            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    required
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Slug *</label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleInputChange}
                    required
                    pattern="[a-z0-9-]+"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Solo letras minúsculas, números y guiones
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Descripción *
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    rows={4}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Precio *</label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      required
                      min="0"
                      step="0.01"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Categoría *
                    </label>
                    <select
                      name="categoryId"
                      value={formData.categoryId}
                      onChange={handleInputChange}
                      required
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Seleccionar...</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Stock Disponible
                    </label>
                    <input
                      type="number"
                      name="stockAvailable"
                      value={formData.stockAvailable}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">
                      Stock Mínimo
                    </label>
                    <input
                      type="number"
                      name="stockMinimum"
                      value={formData.stockMinimum}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Estado</label>
                    <div className="flex h-10 items-center">
                      <input
                        type="checkbox"
                        name="isActive"
                        checked={formData.isActive}
                        onChange={handleInputChange}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">Activo</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                  {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
