/* ============================================================
   File-Based Database — Love For You ❤️
   JSON file storage — works without MongoDB!
   Data persists in server/data/ directory
   ============================================================ */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '..', 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(collection) {
    return path.join(DATA_DIR, `${collection}.json`);
}

function readCollection(collection) {
    const filePath = getFilePath(collection);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]', 'utf-8');
        return [];
    }
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return [];
    }
}

function writeCollection(collection, data) {
    const filePath = getFilePath(collection);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function generateId() {
    return crypto.randomBytes(12).toString('hex');
}

// ── FileDB API (mimics Mongoose-like operations) ──────────────
const fileDB = {
    // Find all documents in a collection
    find(collection, filter = {}) {
        let docs = readCollection(collection);
        if (Object.keys(filter).length > 0) {
            docs = docs.filter(doc => {
                return Object.entries(filter).every(([key, val]) => {
                    // Support $or
                    if (key === '$or') {
                        return val.some(condition =>
                            Object.entries(condition).every(([k, v]) => doc[k] === v)
                        );
                    }
                    // Support $ne
                    if (val && typeof val === 'object' && '$ne' in val) {
                        return doc[key] !== val.$ne;
                    }
                    return doc[key] === val;
                });
            });
        }
        return docs;
    },

    // Find one document
    findOne(collection, filter = {}) {
        const docs = this.find(collection, filter);
        return docs[0] || null;
    },

    // Find by ID
    findById(collection, id) {
        const docs = readCollection(collection);
        return docs.find(doc => doc._id === id) || null;
    },

    // Create a new document
    create(collection, data) {
        const docs = readCollection(collection);
        const now = new Date().toISOString();
        const newDoc = {
            _id: generateId(),
            ...data,
            createdAt: now,
            updatedAt: now,
        };
        docs.push(newDoc);
        writeCollection(collection, docs);
        return newDoc;
    },

    // Update one document
    updateOne(collection, filter, update) {
        const docs = readCollection(collection);
        const index = docs.findIndex(doc =>
            Object.entries(filter).every(([key, val]) => doc[key] === val)
        );
        if (index === -1) return null;
        docs[index] = { ...docs[index], ...update, updatedAt: new Date().toISOString() };
        writeCollection(collection, docs);
        return docs[index];
    },

    // Update many documents
    updateMany(collection, filter, update) {
        const docs = readCollection(collection);
        let count = 0;
        docs.forEach((doc, i) => {
            const matches = Object.entries(filter).every(([key, val]) => doc[key] === val);
            if (matches) {
                docs[i] = { ...doc, ...update, updatedAt: new Date().toISOString() };
                count++;
            }
        });
        writeCollection(collection, docs);
        return count;
    },

    // Delete by ID
    deleteById(collection, id) {
        const docs = readCollection(collection);
        const index = docs.findIndex(doc => doc._id === id);
        if (index === -1) return null;
        const deleted = docs.splice(index, 1)[0];
        writeCollection(collection, docs);
        return deleted;
    },

    // Count documents
    count(collection, filter = {}) {
        return this.find(collection, filter).length;
    },

    // Delete many
    deleteMany(collection, filter = {}) {
        if (Object.keys(filter).length === 0) {
            writeCollection(collection, []);
            return;
        }
        const docs = readCollection(collection);
        const remaining = docs.filter(doc =>
            !Object.entries(filter).every(([key, val]) => doc[key] === val)
        );
        writeCollection(collection, remaining);
    },
};

export default fileDB;
