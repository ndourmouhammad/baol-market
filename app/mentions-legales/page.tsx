import Link from 'next/link'

export const metadata = {
  title: 'Mentions légales - Baol Market',
}

export default function MentionsLegalesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
      <h1 className="text-3xl font-bold text-(--encre) mb-8">Mentions légales</h1>

      <div className="space-y-8 text-(--gris-texte) leading-relaxed">
        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">Éditeur du site</h2>
          <p>
            Le site Baol Market est édité par <strong className="text-(--encre)">Mohamed Saw Business</strong>,
            immatriculé au Registre du Commerce et du Crédit Mobilier (RCCM) sous le numéro{' '}
            <strong className="text-(--encre)">SN.DBL.2023.A.5300</strong>, et identifié au NINEA sous le
            numéro <strong className="text-(--encre)">010768721</strong>.
          </p>
          <p className="mt-2">
            Adresse : Diourbel, Sénégal
            <br />
            Email de contact : <a href="mailto:mohamedsawbusiness@gmail.com" className="text-(--vert-baol) hover:underline">mohamedsawbusiness@gmail.com</a>
            <br />
            WhatsApp : <a href="https://wa.me/221781507505" className="text-(--vert-baol) hover:underline">+221 78 150 75 05</a>
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">Activité</h2>
          <p>
            Baol Market est une marketplace e-commerce mettant en relation des commerçants locaux du Sénégal
            avec des clients particuliers. Les produits proposés sont vérifiés physiquement par l&#39;équipe
            Baol Market avant leur mise en ligne.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">Hébergement</h2>
          <p>
            Le site est hébergé par Vercel Inc., et la base de données est hébergée par Supabase Inc.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">Protection des données personnelles</h2>
          <p>
            Baol Market collecte les données strictement nécessaires au traitement des commandes
            (nom, téléphone, email le cas échéant, adresse de livraison), conformément à la loi
            sénégalaise n° 2008-12 relative à la protection des données à caractère personnel.
            Ces données ne sont ni vendues ni transmises à des tiers en dehors de ce qui est
            nécessaire à l&#39;exécution de la commande (livraison notamment).
          </p>
          <p className="mt-2">
            Pour toute question ou demande relative à vos données personnelles, vous pouvez nous
            contacter à l&#39;adresse indiquée ci-dessus.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-(--encre) mb-2">Conditions générales de vente</h2>
          <p>
            Les conditions applicables aux commandes passées sur Baol Market sont détaillées dans
            nos <Link href="/cgv" className="text-(--vert-baol) hover:underline font-medium">Conditions générales de vente</Link>.
          </p>
        </section>
      </div>
    </div>
  )
}