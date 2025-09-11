// Test script para verificar el funcionamiento del cronjob de arrastre automático
const testCarryoverCron = {
  description: "Script de prueba para el cronjob de arrastre automático",
  
  // Test 1: Verificar endpoint sin autenticación (modo desarrollo)
  async testDevelopmentMode() {
    console.log("🧪 Test 1: Modo desarrollo (sin CRON_SECRET)");
    try {
      const response = await fetch('/api/cron/calculate-carryover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const result = await response.json();
      console.log("✅ Respuesta:", result);
      return result;
    } catch (error) {
      console.error("❌ Error:", error);
      return null;
    }
  },

  // Test 2: Verificar endpoint con autenticación
  async testProductionMode(cronSecret) {
    console.log("🧪 Test 2: Modo producción (con CRON_SECRET)");
    try {
      const response = await fetch('/api/cron/calculate-carryover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${cronSecret}`
        }
      });
      
      const result = await response.json();
      console.log("✅ Respuesta:", result);
      return result;
    } catch (error) {
      console.error("❌ Error:", error);
      return null;
    }
  },

  // Test 3: Verificar método no permitido
  async testMethodNotAllowed() {
    console.log("🧪 Test 3: Método GET (no permitido)");
    try {
      const response = await fetch('/api/cron/calculate-carryover', {
        method: 'GET'
      });
      
      const result = await response.json();
      console.log("✅ Respuesta (debe ser 405):", result);
      return result;
    } catch (error) {
      console.error("❌ Error:", error);
      return null;
    }
  },

  // Test 4: Verificar respuesta cuando ya existe arrastre
  async testIdempotency() {
    console.log("🧪 Test 4: Idempotencia (ejecutar dos veces)");
    
    // Primera ejecución
    const first = await this.testDevelopmentMode();
    console.log("Primera ejecución:", first?.alreadyExists ? "Ya existía" : "Calculado nuevo");
    
    // Segunda ejecución
    const second = await this.testDevelopmentMode();
    console.log("Segunda ejecución:", second?.alreadyExists ? "Ya existía" : "Calculado nuevo");
    
    return { first, second };
  },

  // Ejecutar todos los tests
  async runAllTests(cronSecret = null) {
    console.log("🚀 Iniciando tests del cronjob de arrastre automático");
    console.log("=" .repeat(60));
    
    const results = {};
    
    // Test 1: Modo desarrollo
    results.development = await this.testDevelopmentMode();
    console.log("");
    
    // Test 2: Modo producción (solo si se proporciona secret)
    if (cronSecret) {
      results.production = await this.testProductionMode(cronSecret);
      console.log("");
    }
    
    // Test 3: Método no permitido
    results.methodNotAllowed = await this.testMethodNotAllowed();
    console.log("");
    
    // Test 4: Idempotencia
    results.idempotency = await this.testIdempotency();
    console.log("");
    
    console.log("📊 Resumen de tests:");
    console.log("=" .repeat(60));
    
    Object.entries(results).forEach(([test, result]) => {
      if (result) {
        console.log(`✅ ${test}: ${result.success ? 'PASSED' : 'FAILED'}`);
      } else {
        console.log(`❌ ${test}: ERROR`);
      }
    });
    
    return results;
  }
};

// Función para uso directo en la consola del navegador
function testCarryover(cronSecret = null) {
  return testCarryoverCron.runAllTests(cronSecret);
}

// Export para uso en Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = testCarryoverCron;
}

console.log("📋 Test del cronjob de arrastre cargado.");
console.log("Uso: testCarryover() o testCarryover('tu-cron-secret')");

/* 
INSTRUCCIONES DE USO:

1. En el navegador (consola de desarrollo):
   - Ir a la página de la aplicación
   - Abrir DevTools (F12)
   - Copiar y pegar este script
   - Ejecutar: testCarryover()

2. Con autenticación:
   - Ejecutar: testCarryover('tu-cron-secret')

3. Tests individuales:
   - testCarryoverCron.testDevelopmentMode()
   - testCarryoverCron.testMethodNotAllowed()
   - etc.

RESULTADOS ESPERADOS:

✅ development: PASSED - Debe calcularse o ya existir
✅ methodNotAllowed: PASSED - Debe devolver error 405
✅ idempotency: PASSED - Segunda vez debe decir "alreadyExists: true"

Si tienes CRON_SECRET configurado:
✅ production: PASSED - Debe funcionar con autenticación
*/
