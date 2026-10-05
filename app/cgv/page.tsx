export const metadata = {
  title: 'Conditions générales de vente - Baol Market',
}

export default function CGVPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-(--encre) mb-2">Conditions générales de vente</h1>
      <p className="text-sm text-(--gris-texte) mb-8">Dernière mise à jour : octobre 2026</p>

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
            commande peut toutefois varier ; en cas d&#39;indisponibilité, la commande est annulée,
            le client en est informé dans les meilleurs délais et il est intégralement remboursé
            (voir l&#39;article 7).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">3. Compte et commande</h2>
          <p>
            Pour passer commande, le client doit disposer d&#39;un compte Baol Market. La création
            du compte nécessite un nom, un prénom, un numéro de téléphone et un mot de passe ;
            l&#39;adresse email est facultative. Elle permet notamment de réinitialiser le mot de
            passe en cas d&#39;oubli.
          </p>
          <p className="mt-2">
            La commande est enregistrée lors du paiement en ligne. Une commande qui n&#39;est pas
            payée dans les 30 minutes est annulée automatiquement. Après paiement, notre équipe
            contacte le commerçant et vérifie le produit : la commande passe alors au statut
            « confirmée ». Le client peut suivre chaque étape depuis la rubrique « Mes commandes »
            et reçoit une notification dans l&#39;application à chaque changement de statut.
          </p>
          <p className="mt-2">
            Le prix affiché au moment de la commande est le prix contractuel.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">4. Prix et frais de livraison</h2>
          <p>
            Les prix affichés sont exprimés en francs CFA (FCFA), toutes taxes applicables comprises.
            Des frais de livraison s&#39;ajoutent au prix des produits, selon la zone de livraison
            choisie. Ils sont affichés avant le paiement et sont définitifs : le montant payé par
            le client est le montant total affiché.
          </p>
          <p className="mt-2">
            Pour les zones situées hors de Diourbel, aucun frais de livraison n&#39;est appliqué,
            mais le client organise lui-même la livraison.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">5. Paiement</h2>
          <p>
            Le paiement s&#39;effectue en ligne, au moment de la commande, via la plateforme sécurisée
            PayTech : Orange Money, Wave, Free Money ou carte bancaire. Baol Market ne conserve
            aucune donnée de carte bancaire.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">6. Livraison</h2>
          <p>
            Le client choisit sa zone de livraison lors de la commande. La livraison est assurée par
            l&#39;équipe Baol Market ou ses partenaires livreurs, et un coursier contacte le client
            par téléphone pour convenir de la remise du produit.
          </p>
          <p className="mt-2">
            La livraison à Diourbel s&#39;effectue généralement sous 24 à 72 heures après la
            confirmation de la commande. Ce délai est indicatif et peut varier selon la
            disponibilité des produits et des livreurs.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">7. Annulation et remboursement</h2>
          <p>
            Le client peut annuler sa commande depuis la rubrique « Mes commandes » tant qu&#39;elle
            n&#39;a pas atteint le statut « confirmée ». Une fois la commande confirmée, elle ne peut
            plus être annulée.
          </p>
          <p className="mt-2">
            En cas d&#39;annulation avant confirmation, ou si un produit est indisponible, le client
            est remboursé de la totalité du montant payé, frais de livraison compris. Le
            remboursement est effectué sous 7 jours ouvrables, par le même moyen que celui utilisé
            pour le paiement (Orange Money, Wave ou carte bancaire), ou par un autre moyen convenu
            avec le client.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">8. Retours et réclamations</h2>
          <p>
            Toute non-conformité entre le produit livré et le produit commandé (produit différent,
            défectueux ou endommagé) doit être signalée dans les 48 heures suivant la livraison,
            en contactant Baol Market par WhatsApp au +221 78 150 75 05 ou par email à
            mohamedsawbusiness@gmail.com. Après vérification, le produit concerné est remboursé
            ou échangé.
          </p>
          <p className="mt-2">
            Les retours pour simple changement d&#39;avis ne sont pas acceptés, sauf accord
            exceptionnel de Baol Market.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">9. Responsabilité</h2>
          <p>
            Baol Market s&#39;engage à vérifier chaque produit avant sa mise en ligne. Sa
            responsabilité ne saurait être engagée en cas de mauvaise utilisation du produit par
            le client, ou de force majeure affectant la livraison.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">10. Données personnelles</h2>
          <p>
            Baol Market collecte les données nécessaires au traitement des commandes : nom, prénom,
            numéro de téléphone et, le cas échéant, adresse email. Leur traitement est décrit dans
            nos{' '}
            <a href="/mentions-legales" className="text-(--vert-baol) hover:underline font-medium">mentions légales</a>,
            conformément à la loi sénégalaise n° 2008-12.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">11. Droit applicable</h2>
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