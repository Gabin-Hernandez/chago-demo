#!/usr/bin/env node

/**
 * Script para inicializar Firestore con la estructura mínima necesaria
 * Este script crea las colecciones y documentos básicos para que el sistema funcione
 * 
 * Uso: node scripts/setup-firestore-basic.js
 */

const admin = require('firebase-admin');

// Inicializar Firebase Admin con las credenciales del .env
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID || "chago-demo",
    private_key: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@chago-demo.iam.gserviceaccount.com",
};

// Inicializar solo si no está ya inicializado
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

const db = admin.firestore();

/**
 * Crear roles básicos en Firestore
 */
async function createBasicRoles() {
    console.log('📝 Creando roles básicos...');

    const roles = [
        {
            id: 'administrativo',
            name: 'Administrativo',
            description: 'Acceso completo al sistema',
            permissions: {
                transactions: { create: true, read: true, update: true, delete: true },
                catalogs: { create: true, read: true, update: true, delete: true },
                reports: { read: true, export: true },
                users: { create: true, read: true, update: true, delete: true },
                settings: { read: true, update: true }
            }
        },
        {
            id: 'contador',
            name: 'Contador',
            description: 'Acceso de lectura y reportes',
            permissions: {
                transactions: { create: false, read: true, update: false, delete: false },
                catalogs: { create: false, read: true, update: false, delete: false },
                reports: { read: true, export: true },
                users: { create: false, read: true, update: false, delete: false },
                settings: { read: true, update: false }
            }
        },
        {
            id: 'director_general',
            name: 'Director General',
            description: 'Acceso de lectura y aprobación',
            permissions: {
                transactions: { create: false, read: true, update: true, delete: false },
                catalogs: { create: false, read: true, update: false, delete: false },
                reports: { read: true, export: true },
                users: { create: false, read: true, update: false, delete: false },
                settings: { read: true, update: false }
            }
        }
    ];

    for (const role of roles) {
        try {
            await db.collection('roles').doc(role.id).set(role);
            console.log(`✅ Rol creado: ${role.name}`);
        } catch (error) {
            console.error(`❌ Error creando rol ${role.name}:`, error.message);
        }
    }
}

/**
 * Crear documento de usuario para el primer usuario autenticado
 */
async function createUserDocument(uid, email, role = 'administrativo') {
    console.log(`📝 Creando documento de usuario para ${email}...`);

    try {
        await db.collection('users').doc(uid).set({
            email: email,
            role: role,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isActive: true
        });
        console.log(`✅ Usuario creado: ${email} con rol ${role}`);
    } catch (error) {
        console.error(`❌ Error creando usuario:`, error.message);
    }
}

/**
 * Verificar si ya existen roles en Firestore
 */
async function checkExistingRoles() {
    const rolesSnapshot = await db.collection('roles').get();
    return !rolesSnapshot.empty;
}

/**
 * Main function
 */
async function main() {
    try {
        console.log('🚀 Iniciando configuración de Firestore...\n');

        // Verificar si ya existen roles
        const rolesExist = await checkExistingRoles();

        if (rolesExist) {
            console.log('ℹ️  Los roles ya existen en Firestore.');
            console.log('   Si deseas recrearlos, elimínalos manualmente desde Firebase Console.\n');
        } else {
            await createBasicRoles();
            console.log('\n✅ Roles creados exitosamente.\n');
        }

        // Instrucciones para crear usuario
        console.log('📋 SIGUIENTE PASO:');
        console.log('   Para crear un documento de usuario, ejecuta:');
        console.log('   node scripts/setup-firestore-basic.js create-user <UID> <EMAIL> [ROLE]\n');
        console.log('   Ejemplo:');
        console.log('   node scripts/setup-firestore-basic.js create-user abc123 user@example.com administrativo\n');
        console.log('   Puedes obtener el UID desde Firebase Console > Authentication\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

// CLI handling
const args = process.argv.slice(2);
const command = args[0];

if (command === 'create-user') {
    const uid = args[1];
    const email = args[2];
    const role = args[3] || 'administrativo';

    if (!uid || !email) {
        console.error('❌ Error: Debes proporcionar UID y EMAIL');
        console.log('   Uso: node scripts/setup-firestore-basic.js create-user <UID> <EMAIL> [ROLE]');
        process.exit(1);
    }

    createUserDocument(uid, email, role)
        .then(() => {
            console.log('\n✅ Usuario creado exitosamente.');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
} else {
    main();
}
