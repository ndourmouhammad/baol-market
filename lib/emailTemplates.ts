type OrderItemForEmail = {
  quantity: number
  unit_price: number
  products: { name: string }[] | { name: string } | null
}

type OrderForEmail = {
  id: string
  total_amount: number
  delivery_address?: string
  payment_method?: string
  order_items?: OrderItemForEmail[]
}

export const STATUS_LABELS: Record<string, string> = {
  created: 'Reçue',
  confirmed: 'Confirmée',
  payment_pending: 'Paiement en attente',
  paid: 'Payée',
  preparing: 'En préparation',
  delivering: 'En livraison',
  delivered: 'Livrée',
  cancelled: 'Annulée',
  refunded: 'Remboursée',
}

const wrapper = (title: string, body: string) => `
<div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #FAF3E7;">
  <div style="background: #3D2B1F; padding: 24px; text-align: center;">
    <h1 style="color: #F5E6C8; font-size: 20px; margin: 0;">Baol Market</h1>
  </div>
  <div style="padding: 24px; background: white;">
    <h2 style="color: #3D2B1F; font-size: 18px;">${title}</h2>
    ${body}
  </div>
  <div style="padding: 16px; text-align: center; color: #8B5E3C; font-size: 12px;">
    Baol Market — des produits vérifiés, livrés en confiance.
  </div>
</div>
`

export function orderConfirmationEmail(order: OrderForEmail) {
  const itemsHtml = (order.order_items || [])
    .map((item) => {
      const productName = Array.isArray(item.products)
        ? item.products[0]?.name
        : item.products?.name
      return `<li>${item.quantity}× ${productName ?? 'Produit'}</li>`
    })
    .join('')

  return wrapper(
    'Votre commande a bien été reçue',
    `
      <p style="color: #3D2B1F;">Merci pour votre commande <strong>#${order.id.slice(0, 8).toUpperCase()}</strong>.</p>
      <ul style="color: #3D2B1F;">${itemsHtml}</ul>
      <p style="color: #3D2B1F;"><strong>Total : ${order.total_amount.toLocaleString('fr-FR')} FCFA</strong></p>
      <p style="color: #3D2B1F;">Adresse de livraison : ${order.delivery_address ?? ''}</p>
      <p style="color: #3D2B1F;">Nous vous tiendrons informé(e) de chaque étape de votre commande.</p>
    `
  )
}
export function orderStatusUpdateEmail(order: OrderForEmail & { status: string }) {
  const label = STATUS_LABELS[order.status] ?? order.status
  return wrapper(
    'Mise à jour de votre commande',
    `
      <p style="color: #3D2B1F;">Votre commande <strong>#${order.id.slice(0, 8).toUpperCase()}</strong> est maintenant :</p>
      <p style="font-size: 18px; font-weight: bold; color: #8B5E3C;">${label}</p>
      <p style="color: #3D2B1F;">Total : ${order.total_amount.toLocaleString('fr-FR')} FCFA</p>
    `
  )
}