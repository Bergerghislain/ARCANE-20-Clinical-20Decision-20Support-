// diagnostic_corrected.mjs - Script de diagnostic corrigé
import pg from 'pg';
const { Pool } = pg;

async function testDatabase() {
  // 1. CRÉER l'instance de connexion avec vos paramètres
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'arcane_db',
    user: 'postgres',
    password: 'votre_motdepasse', // ← À VÉRIFIER ICI
  });

  const client = await pool.connect(); // Déclarer client ici pour le scope

  try {
    console.log('=== TEST DE CONNEXION POSTGRESQL ===');
    
    console.log('✅ Connexion PostgreSQL établie');
    
    // Test 2: Vérifier la table patients
    const result = await client.query(`
      SELECT 
        COUNT(*) as patient_count,
        EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='patients' AND column_name='id_patient') as has_id_patient,
        EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name='patients' AND column_name='name') as has_name
      FROM patients;
    `);
    
    console.log('✅ Structure de la table patients:');
    console.log(`   - Nombre de patients: ${result.rows[0].patient_count}`);
    console.log(`   - Colonne id_patient: ${result.rows[0].has_id_patient ? '✅' : '❌'}`);
    console.log(`   - Colonne name: ${result.rows[0].has_name ? '✅' : '❌'}`);
    
    // Test 3: Voir quelques patients
    const patients = await client.query('SELECT id_patient, name, ipp, sex FROM patients LIMIT 5');
    console.log('✅ Patients (5 premiers):');
    
    if (patients.rows.length === 0) {
      console.log('   - Aucun patient trouvé dans la table');
    } else {
      patients.rows.forEach(p => {
        console.log(`   - ${p.id_patient}: "${p.name || '(sans nom)'}" (${p.ipp}) - ${p.sex || 'Non spécifié'}`);
      });
    }
    
    console.log('=== DIAGNOSTIC TERMINÉ ===');
    return true;
    
  } catch (error) {
    console.error('❌ ERREUR:', error.message);
    
    // Aide au diagnostic selon le type d'erreur
    if (error.message.includes('password authentication failed')) {
      console.error('   → Vérifiez le mot depose dans le script (ligne 13)');
    } else if (error.message.includes('does not exist')) {
      console.error('   → La base "arcane_db" n\'existe peut-être pas');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('   → PostgreSQL n\'est pas démarré ou écoute sur un autre port');
    }
    return false;
  } finally {
    // 3. TOUJOURS libérer le client et fermer le pool
    if (client) client.release();
    await pool.end();
  }
}

// Exécuter
testDatabase();