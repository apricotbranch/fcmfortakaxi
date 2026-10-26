import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

const db = getFirestore();

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { rideType, pickupAddress, estimatedPrice } = req.body;

  try {
    // 1. Query Firestore for active, online drivers matching the vehicle type
    const driversSnapshot = await db.collection('users')
      .where('role', '==', 'driver')
      .where('isOnline', '==', true)
      .where('vehicleType', '==', rideType.toLowerCase())
      .get();

    const tokens = [];
    driversSnapshot.forEach(doc => {
      const token = doc.data().fcmToken;
      if (token) tokens.push(token);
    });

    if (tokens.length === 0) {
      return res.status(200).json({ success: true, message: 'No online drivers found' });
    }

    // 2. Build direct FCM payload targeting verified online tokens
    const message = {
      notification: {
        title: `New ${rideType} Ride Request!`,
        body: `Pickup: ${pickupAddress} • ₹${Math.round(estimatedPrice)}`
      },
      tokens: tokens
    };

    await getMessaging().sendEachForMulticast(message);
    return res.status(200).json({ success: true, notifiedCount: tokens.length });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}
