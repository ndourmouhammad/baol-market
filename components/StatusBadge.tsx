import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const getStatusConfig = (s: string) => {
    const normalized = s.toLowerCase();
    
    // Livrée (vert)
    if (['delivered', 'livrée', 'terminée'].includes(normalized)) {
      return { text: 'Livrée', className: 'bg-(--vert-baol) text-white' };
    }
    
    // Annulée / Retournée / Remboursée (gris neutre)
    if (['cancelled', 'annulée', 'refunded', 'retournée', 'remboursée'].includes(normalized)) {
      return { text: 'Annulée / Remboursée', className: 'bg-gray-200 text-gray-700' };
    }
    
    // Intermédiaires importants (or)
    if (['delivering', 'en livraison', 'preparing', 'en préparation'].includes(normalized)) {
      const text = ['delivering', 'en livraison'].includes(normalized) ? 'En livraison' : 'En préparation';
      return { text, className: 'bg-(--or-senegal) text-(--encre)' };
    }
    
    // Intermédiaires normaux (gris texte ou fond gris texte clair)
    if (['confirmed', 'confirmée', 'paid', 'payée'].includes(normalized)) {
      return { text: 'Confirmée', className: 'bg-gray-100 text-(--encre) font-bold' };
    }
    
    if (['created', 'créée', 'payment_pending', 'en attente'].includes(normalized)) {
      return { text: 'En attente', className: 'bg-white border border-gray-300 text-(--gris-texte)' };
    }
    
    return { text: s, className: 'bg-gray-100 text-gray-700' };
  };

  const config = getStatusConfig(status);

  return (
    <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-xl inline-block ${config.className}`}>
      {config.text}
    </span>
  );
}
