export const metadata = {
  title: 'Conditions générales de vente - Baol Market',
}

export default function CGVPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-(--encre) mb-2">Conditions générales de vente</h1>
      <p className="text-sm text-(--gris-texte) mb-8">Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long' })}</p>

      <div className="space-y-8 text-(--gris-texte) leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">1. Objet</h2>
          <p>
            Les présentes conditions générales de vente (CGV) régissent les relations contractuelles
            entre Mohamed Saw Business, exploitant le site Baol Market (RCCM SN.DBL.2023.A.5300,
            NINEA 010768721), et toute personne passant commande sur ce site (le « client »).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">2. Produits</h2>
          <p>
            Chaque produit proposé sur Baol Market est vérifié physiquement par notre équipe avant
            sa mise en ligne : les photos et descriptions correspondent au produit réellement
            disponible au moment de la publication. La disponibilité effective au moment de la
            commande peut toutefois varier ; en cas d&#39;indisponibilité, la commande est annulée
            sans frais et le client en est informé dans les meilleurs délais.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">3. Commande</h2>
          <p>
            La commande peut être passée avec ou sans création de compte. Dans ce dernier cas, un
            numéro de téléphone valide est requis ; l&#39;adresse email est optionnelle et sert
            uniquement à l&#39;envoi d&#39;un suivi de commande. Un code de suivi est fourni pour
            toute commande passée sans compte.
          </p>
          <p className="mt-2">
            La commande est confirmée après validation de la disponibilité du ou des produits
            commandés. Le prix affiché au moment de la commande est le prix contractuel.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">4. Prix et frais de livraison</h2>
          <p>
            Les prix affichés sont exprimés en francs CFA (FCFA), toutes taxes applicables comprises.
            Des frais de livraison s&#39;ajoutent au prix des produits, selon la zone de livraison
            choisie, affichés avant validation de la commande. Pour certaines zones éloignées, le
            montant exact des frais de livraison peut nécessiter une confirmation par téléphone
            après la commande.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">5. Paiement</h2>
          <p>
            Le paiement s&#39;effectue à la livraison, en espèces, directement auprès du livreur.
            D&#39;autres moyens de paiement pourront être proposés ultérieurement.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">6. Livraison</h2>
          <p>
            La livraison est assurée par l&#39;équipe Baol Market ou ses partenaires livreurs, à
            l&#39;adresse indiquée par le client lors de la commande. Les délais communiqués sont
            donnés à titre indicatif.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">7. Retours et réclamations</h2>
          <p>
            Toute non-conformité entre le produit livré et le produit commandé (produit différent,
            défectueux ou endommagé) doit être signalée dans les 48 heures suivant la livraison,
            en contactant Baol Market par téléphone, WhatsApp ou email. Un remboursement ou un
            échange sera proposé après vérification.
          </p>
          <p className="mt-2">
            Les retours pour simple changement d&#39;avis ne sont pas acceptés, sauf accord
            exceptionnel de Baol Market.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">8. Responsabilité</h2>
          <p>
            Baol Market s&#39;engage à vérifier chaque produit avant sa mise en ligne. Sa
            responsabilité ne saurait être engagée en cas de mauvaise utilisation du produit par
            le client, ou de force majeure affectant la livraison.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">9. Données personnelles</h2>
          <p>
            Le traitement des données personnelles des clients est décrit dans nos{' '}
            <a href="/mentions-legales" className="text-(--vert-baol) hover:underline font-medium">mentions légales</a>,
            conformément à la loi sénégalaise n° 2008-12.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">10. Droit applicable</h2>
          <p>
            Les présentes CGV sont soumises au droit sénégalais. Tout litige relatif à leur
            interprétation ou à leur exécution relève de la compétence des juridictions
            sénégalaises compétentes.
          </p>
        </section>
      </div>
    </div>
  )
}