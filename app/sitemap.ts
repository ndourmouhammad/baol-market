import type { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'
import { SITE_URL } from '@/lib/siteUrl'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}`,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${SITE_URL}/produits`,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/ventes-flash`,
      changeFrequency: 'daily',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/cgv`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/mentions-legales`,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]

  let categoryEntries: MetadataRoute.Sitemap = []
  try {
    const { data: categories } = await supabase
      .from('categories')
      .select('slug')
      .limit(5000)

    if (categories) {
      categoryEntries = categories
        .filter((cat) => Boolean(cat.slug))
        .map((cat) => ({
          url: `${SITE_URL}/categorie/${cat.slug}`,
          changeFrequency: 'weekly',
          priority: 0.7,
        }))
    }
  } catch (error) {
    console.error('Erreur sitemap categories:', error)
  }

  let productEntries: MetadataRoute.Sitemap = []
  try {
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('is_available', true)
      .limit(5000)

    if (products) {
      productEntries = products
        .filter((product) => Boolean(product.id))
        .map((product) => ({
          url: `${SITE_URL}/produit/${product.id}`,
          changeFrequency: 'weekly',
          priority: 0.8,
        }))
    }
  } catch (error) {
    console.error('Erreur sitemap products:', error)
  }

  return [...staticEntries, ...categoryEntries, ...productEntries]
}
