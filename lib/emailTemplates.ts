type OrderItemForEmail = {
  quantity: number
  unit_price: number
  products: { name: string }[] | { name: string } | null
}

type OrderForEmail = {
  id: string
  total_amount: number
  subtotal_amount?: number | null
  delivery_fee?: number | null
  delivery_fee_confirmed?: boolean | null
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
    Baol Market - des produits vérifiés, livrés en confiance.
  </div>
</div>
`

function amountBreakdownHtml(order: OrderForEmail) {
  const subtotal = order.subtotal_amount ?? order.total_amount
  const deliveryFee = order.delivery_fee ?? 0
  const feeLabel = order.delivery_fee_confirmed === false
    ? `${deliveryFee.toLocaleString('fr-FR')} FCFA (à confirmer)`
    : `${deliveryFee.toLocaleString('fr-FR')} FCFA`

  return `
    <table style="width: 100%; color: #3D2B1F; font-size: 14px; margin: 12px 0;">
      <tr>
        <td style="padding: 4px 0;">Sous-total produits</td>
        <td style="padding: 4px 0; text-align: right;">${subtotal.toLocaleString('fr-FR')} FCFA</td>
      </tr>
      <tr>
        <td style="padding: 4px 0;">Frais de livraison</td>
        <td style="padding: 4px 0; text-align: right;">${feeLabel}</td>
      </tr>
      <tr style="font-weight: bold; border-top: 1px solid #E0D5C0;">
        <td style="padding: 8px 0 0;">Total</td>
        <td style="padding: 8px 0 0; text-align: right;">${order.total_amount.toLocaleString('fr-FR')} FCFA</td>
      </tr>
    </table>
  `
}

export function orderConfirmationEmail(order: OrderForEmail) {
  const itemsHtml = (order.order_items || [])
    .map((item) => {
      const productName = Array.isArray(item.products)
        ? item.products[0]?.name
        : item.products?.name
      return `<li>${item.quantity}× ${productName ?? 'Produit'}</li>`
    })
    .join('')

  const feeNotice = order.delivery_fee_confirmed === false
    ? `<p style="color: #8B5E3C; font-size: 13px; background: #F5E6C8; padding: 10px; border-radius: 4px;">Votre zone de livraison étant hors de notre périmètre habituel, les frais de livraison exacts vous seront confirmés par téléphone.</p>`
    : ''

  return wrapper(
    'Votre commande a bien été reçue',
    `
      <p style="color: #3D2B1F;">Merci pour votre commande <strong>#${order.id.slice(0, 8).toUpperCase()}</strong>.</p>
      <ul style="color: #3D2B1F;">${itemsHtml}</ul>
      ${amountBreakdownHtml(order)}
      ${feeNotice}
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
      ${amountBreakdownHtml(order)}
    `
  )
}