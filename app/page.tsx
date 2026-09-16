import { supabase } from '@/lib/supabase'

export default async function Home() {
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, description, price, image_url')
    .eq('is_available', true)
    .order('created_at', { ascending: false })

  if (error) {
    return <p style={{ padding: 20 }}>Erreur de chargement : {error.message}</p>
  }

  return (
    <div style={{ maxWidth: 900, margin: '40px auto', padding: 20 }}>
      <h1>Baol Market — Catalogue</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 20, marginTop: 20 }}>
        {products?.map((product) => (
          <div key={product.id} style={{ border: '1px solid #ddd', borderRadius: 8, padding: 16 }}>
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 4 }} />
            ) : (
              <div style={{ width: '100%', height: 150, background: '#f0f0f0', borderRadius: 4 }} />
            )}
            <h3>{product.name}</h3>
            <p style={{ color: '#666', fontSize: 14 }}>{product.description}</p>
            <p style={{ fontWeight: 'bold' }}>{product.price} FCFA</p>
          </div>
        ))}
      </div>
    </div>
  )
}