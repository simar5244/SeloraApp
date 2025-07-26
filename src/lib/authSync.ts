import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || '';

export const syncUserToAuthDB = async (userData: any) => {
  let client: MongoClient | null = null;
  try {
    const authDbURI = uri.replace(/\/[^/]+(\?|$)/, '/auth_db$1');
    client = new MongoClient(authDbURI);
    await client.connect();

    const authDb = client.db('auth_db');
    const authUsersCollection = authDb.collection('authUsers');

    const { _id, password, ...restOfUserData } = userData;

    const updateData = {
      ...restOfUserData,
      userId: _id.toString(),
      originalId: _id,
      lastSynced: new Date(),
    };

    await authUsersCollection.updateOne(
      { userId: _id.toString() },
      { $set: updateData },
      { upsert: true }
    );

    console.log(`[AUTH SYNC] Successfully synced user ${_id} to auth_db`);
  } catch (error) {
    console.error('[AUTH SYNC] Error syncing user to auth_db:', error);
  } finally {
    if (client) {
      await client.close();
    }
  }
};