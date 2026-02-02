#!/usr/bin/env node

/**
 * Script para inicializar Firestore con la estructura mínima necesaria
 * Este script crea las colecciones y documentos básicos para que el sistema funcione
 * 
 * Uso: node scripts/setup-firestore.js
 */

// Cargar variables de entorno desde .env.local
require('dotenv').config({ path: '.env.local' });

const admin = require('firebase-admin');

// Verificar que las variables de entorno estén cargadas
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_PRIVATE_KEY) {
    console.error('❌ Error: No se encontraron las variables de entorno de Firebase.');
    console.error('   Asegúrate de que .env.local existe y contiene:');
    console.error('   - FIREBASE_PROJECT_ID');
    console.error('   - FIREBASE_PRIVATE_KEY');
    console.error('   - FIREBASE_CLIENT_EMAIL');
    process.exit(1);
}

// Inicializar Firebase Admin con las credenciales del .env
const serviceAccount = {
    type: "service_account",
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
};

console.log('🔧 Configurando Firebase Admin...');
console.log('   Project ID:', serviceAccount.project_id);
console.log('   Client Email:', serviceAccount.client_email);

// Inicializar solo si no está ya inicializado
if (!admin.apps.length) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log('✅ Firebase Admin inicializado correctamente\n');
    } catch (error) {
        console.error('❌ Error inicializando Firebase Admin:', error.message);
        process.exit(1);
    }
}

const db = admin.firestore();

/**
 * Crear roles básicos en Firestore
 */
async function createBasicRoles() {
    console.log('📝 Creando roles básicos en Firestore...\n');

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

    let successCount = 0;
    for (const role of roles) {
        try {
            await db.collection('roles').doc(role.id).set(role);
            console.log(`   ✅ Rol creado: ${role.name} (${role.id})`);
            successCount++;
        } catch (error) {
            console.error(`   ❌ Error creando rol ${role.name}:`, error.message);
        }
    }

    console.log(`\n✅ ${successCount}/${roles.length} roles creados exitosamente.\n`);
    return successCount;
}

/**
 * Crear documento de usuario para el primer usuario autenticado
 */
async function createUserDocument(uid, email, role = 'administrativo') {
    console.log(`📝 Creando documento de usuario...\n`);
    console.log(`   UID: ${uid}`);
    console.log(`   Email: ${email}`);
    console.log(`   Rol: ${role}\n`);

    try {
        await db.collection('users').doc(uid).set({
            email: email,
            role: role,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            isActive: true
        });
        console.log(`✅ Usuario creado exitosamente.\n`);
        return true;
    } catch (error) {
        console.error(`❌ Error creando usuario:`, error.message);
        return false;
    }
}

/**
 * Verificar si ya existen roles en Firestore
 */
async function checkExistingRoles() {
    try {
        const rolesSnapshot = await db.collection('roles').get();
        return !rolesSnapshot.empty;
    } catch (error) {
        console.error('❌ Error verificando roles existentes:', error.message);
        return false;
    }
}

/**
 * Listar usuarios de Firebase Auth
 */
async function listAuthUsers() {
    console.log('👥 Usuarios en Firebase Authentication:\n');

    try {
        const listUsersResult = await admin.auth().listUsers(10);

        if (listUsersResult.users.length === 0) {
            console.log('   ⚠️  No hay usuarios en Firebase Authentication.');
            console.log('   Crea un usuario primero desde Firebase Console > Authentication\n');
            return [];
        }

        listUsersResult.users.forEach((userRecord, index) => {
            console.log(`   ${index + 1}. UID: ${userRecord.uid}`);
            console.log(`      Email: ${userRecord.email || 'Sin email'}`);
            console.log(`      Creado: ${new Date(userRecord.metadata.creationTime).toLocaleDateString()}\n`);
        });

        return listUsersResult.users;
    } catch (error) {
        console.error('❌ Error listando usuarios:', error.message);
        return [];
    }
}

/**
 * Main function
 */
async function main() {
    try {
        console.log('🚀 Iniciando configuración de Firestore...\n');
        console.log('='.repeat(50) + '\n');

        // Verificar si ya existen roles
        const rolesExist = await checkExistingRoles();

        if (rolesExist) {
            console.log('ℹ️  Los roles ya existen en Firestore.');
            console.log('   Si deseas recrearlos, elimínalos manualmente desde Firebase Console.\n');
        } else {
            await createBasicRoles();
        }

        // Listar usuarios disponibles
        const users = await listAuthUsers();

        if (users.length > 0) {
            console.log('📋 SIGUIENTE PASO - Crear documento de usuario:\n');
            console.log('   Para crear un documento de usuario, ejecuta:\n');
            console.log('   node scripts/setup-firestore.js create-user <UID> <EMAIL> [ROLE]\n');
            console.log('   Ejemplo con el primer usuario:\n');
            console.log(`   node scripts/setup-firestore.js create-user ${users[0].uid} ${users[0].email || 'email@example.com'} administrativo\n`);
        }

        console.log('='.repeat(50));
        console.log('✅ Configuración completada.\n');

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
        console.log('   Uso: node scripts/setup-firestore.js create-user <UID> <EMAIL> [ROLE]\n');
        console.log('   Roles disponibles: administrativo, contador, director_general');
        process.exit(1);
    }

    console.log('🚀 Creando usuario en Firestore...\n');
    console.log('='.repeat(50) + '\n');

    createUserDocument(uid, email, role)
        .then((success) => {
            if (success) {
                console.log('='.repeat(50));
                console.log('✅ Usuario creado exitosamente.\n');
                console.log('   Ahora puedes iniciar sesión con:');
                console.log(`   Email: ${email}`);
                console.log(`   Rol: ${role}\n`);
            }
            process.exit(success ? 0 : 1);
        })
        .catch((error) => {
            console.error('❌ Error:', error);
            process.exit(1);
        });
} else {
    main();
}
