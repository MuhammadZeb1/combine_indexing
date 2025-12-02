const { MongoClient } = require('mongodb');

const localURI = 'mongodb://localhost:27017/IndexingToolDB';
const atlasURI = 'mongodb+srv://zeb11afridi_db_user:r2y4bK2X4vaoCXtn@cluster0.ygn6hhw.mongodb.net/indexing-url';

async function copyData() {
    const localClient = new MongoClient(localURI);
    const atlasClient = new MongoClient(atlasURI);

    try {
        await localClient.connect();
        await atlasClient.connect();

        const localDb = localClient.db('IndexingToolDB');
        const atlasDb = atlasClient.db('indexing-url');

        const collections = await localDb.collections();

        for (let coll of collections) {
            const data = await coll.find().toArray();
            if (data.length > 0) {
                const atlasColl = atlasDb.collection(coll.collectionName);
                await atlasColl.insertMany(data);
                console.log(`Copied ${data.length} documents from ${coll.collectionName}`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await localClient.close();
        await atlasClient.close();
    }
}

copyData();
