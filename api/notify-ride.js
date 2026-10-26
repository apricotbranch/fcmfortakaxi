import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { rideType, pickupAddress, estimatedPrice } = req.body;

  const message = {
    notification: {
      title: `New ${rideType} Ride Request!`,
      body: `Pickup: ${pickupAddress} • ₹${Math.round(estimatedPrice)}`
    },
    topic: `drivers_${rideType.toLowerCase()}`
  };

  try {
    await getMessaging().send(message);
    return res.status(200).json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
