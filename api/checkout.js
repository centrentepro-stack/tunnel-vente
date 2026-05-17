import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Méthode non autorisée' });

  try {
    const { prenom, email, bump } = req.body;

    // Montants
    const montantBase = 4700; // 47€ en centimes
    const montantBump = 1700; // 17€ en centimes
    const montantTotal = bump ? montantBase + montantBump : montantBase;

    // Créer ou récupérer le client Stripe
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer;
    if (customers.data.length > 0) {
      customer = customers.data[0];
    } else {
      customer = await stripe.customers.create({ email, name: prenom });
    }

    // Créer le Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: montantTotal,
      currency: 'eur',
      customer: customer.id,
      metadata: {
        prenom,
        email,
        bump: bump ? 'oui' : 'non',
        produits: bump ? 'offre-principale,order-bump' : 'offre-principale'
      },
      automatic_payment_methods: { enabled: true }
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      montantTotal: montantTotal / 100
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}
