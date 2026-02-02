const admin = require('firebase-admin');

// Configuración de Firebase Admin
// Asegúrate de tener el archivo serviceAccountKey.json en la raíz del proyecto
// Descárgalo desde: Firebase Console > Project Settings > Service Accounts > Generate New Private Key

try {
    const serviceAccount = require('../serviceAccountKey.json');

    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
} catch (error) {
    console.error('❌ Error: No se pudo cargar serviceAccountKey.json');
    console.error('   Descarga el archivo desde Firebase Console > Project Settings > Service Accounts');
    process.exit(1);
}

const db = admin.firestore();

// Permisos por defecto para cada rol
const DEFAULT_ROLE_PERMISSIONS = {
    administrativo: {
        canViewDashboard: true,
        canManageTransactions: true,
        canViewEntradas: true,
        canViewSalidas: true,
        canViewHistorial: true,
        canManageProviders: true,
        canManageConcepts: true,
        canManageDescriptions: true,
        canManageGenerales: true,
        canManageSubconcepts: true,
        canViewReports: true,
        canViewAnalisisIA: true,
        canManageSettings: true,
        canManageUsers: true,
        canDeleteCatalogItems: true,
        canDeleteTransactions: true,
        canDeletePayments: true,
    },
    contador: {
        canViewDashboard: true,
        canManageTransactions: true,
        canViewEntradas: true,
        canViewSalidas: true,
        canViewHistorial: true,
        canManageProviders: true,
        canManageConcepts: true,
        canManageDescriptions: true,
        canManageGenerales: true,
        canManageSubconcepts: true,
        canViewReports: false,
        canViewAnalisisIA: false,
        canManageSettings: false,
        canManageUsers: false,
        canDeleteCatalogItems: false,
        canDeleteTransactions: false,
        canDeletePayments: false,
    },
    director_general: {
        canViewDashboard: true,
        canManageTransactions: false,
        canViewEntradas: true,
        canViewSalidas: true,
        canViewHistorial: true,
        canManageProviders: false,
        canManageConcepts: false,
        canManageDescriptions: false,
        canManageGenerales: false,
        canManageSubconcepts: false,
        canViewReports: false,
        canViewAnalisisIA: false,
        canManageSettings: false,
        canManageUsers: false,
        canDeleteCatalogItems: false,
        canDeleteTransactions: false,
        canDeletePayments: false,
    },
};

/**
 * Inicializa los roles en Firestore
 */
async function initializeRoles() {
    try {
        console.log('🚀 Inicializando roles en Firestore...\n');

        for (const [roleName, permissions] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
            await db.collection('roles').doc(roleName).set({
                permissions,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            console.log(`✅ Rol "${roleName}" creado con ${Object.keys(permissions).length} permisos`);
        }

        console.log('\n✅ Todos los roles inicializados correctamente');
        console.log('\n📋 Próximos pasos:');
        console.log('   1. Configura las reglas de seguridad en Firebase Console');
        console.log('   2. Crea documentos en users/{uid} para tus usuarios');
        console.log('   3. Cambia NEXT_PUBLIC_DEMO_MODE=false en .env.local');
        console.log('   4. Descomenta la línea 112 en roleService.js');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error inicializando roles:', error);
        process.exit(1);
    }
}

/**
 * Crea un documento de usuario de ejemplo
 * Uso: node init-firestore-roles.js create-user <uid> <email> <role>
 */
async function createUserDocument(uid, email, role = 'administrativo') {
    try {
        const validRoles = ['administrativo', 'contador', 'director_general'];

        if (!validRoles.includes(role)) {
            console.error(`❌ Rol inválido. Debe ser uno de: ${validRoles.join(', ')}`);
            process.exit(1);
        }

        await db.collection('users').doc(uid).set({
            email,
            role,
            isActive: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`✅ Usuario creado:`);
        console.log(`   UID: ${uid}`);
        console.log(`   Email: ${email}`);
        console.log(`   Rol: ${role}`);

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creando usuario:', error);
        process.exit(1);
    }
}

// CLI
const args = process.argv.slice(2);
const command = args[0];

if (command === 'create-user') {
    const [, uid, email, role] = args;

    if (!uid || !email) {
        console.error('❌ Uso: node init-firestore-roles.js create-user <uid> <email> [role]');
        console.error('   Ejemplo: node init-firestore-roles.js create-user abc123 user@example.com administrativo');
        process.exit(1);
    }

    createUserDocument(uid, email, role);
} else {
    // Por defecto, inicializar roles
    initializeRoles();
}
