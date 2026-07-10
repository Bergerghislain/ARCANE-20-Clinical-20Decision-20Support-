/**
 * Chaînes UI françaises — pages critiques clinicien.
 * Politique : FR prioritaire ; l'inventaire complet est dans docs/I18N_INVENTORY.md.
 */
export const fr = {
  argos: {
    title: "Assistant clinique ARGOS",
    subtitle: "Votre aide à la décision clinique intelligente",
    generalDiscussion: "Discussion générale",
    generalCondition: "Question générale",
    selectPatient: "Sélectionner un patient",
    selectPatientHint: "Choisissez un patient pour démarrer une consultation ARGOS",
    newConversation: "Nouvelle conversation",
    welcomeMessage:
      "Bonjour, je suis ARGOS, votre assistant d'aide à la décision clinique. Je suis prêt à vous aider pour le raisonnement clinique de ce patient. Partagez votre question ou le contexte clinique.",
    sidebarAll: "Toutes",
    sidebarByPatient: "Par patient",
    inputPlaceholder:
      "Posez votre question clinique à ARGOS (traitement, stadification, prochaines étapes…)",
    deleteConversationConfirm: "Supprimer cette discussion ?",
    analyzing: "ARGOS analyse votre question…",
    inputDisclaimer:
      "Les recommandations ARGOS sont un support décisionnel. Validez toujours avec votre expertise clinique.",
    unknownCondition: "Diagnostic non renseigné",
    years: "ans",
  },
  dashboard: {
    subtitle:
      "Gérez vos patients et accédez à l'aide à la décision clinique ARGOS",
    addPatient: "Ajouter un patient",
    importJson: "Importer JSON",
    importing: "Import en cours…",
    openArgos: "Ouvrir ARGOS",
    searchPlaceholder: "Rechercher par nom ou pathologie…",
    loadingPatients: "Chargement des patients…",
    loadMore: "Charger plus de patients",
    loading: "Chargement…",
    unknownPatient: "Patient inconnu",
    unknownCondition: "Pathologie inconnue",
    unknownBirthDate: "Date de naissance inconnue",
    importFailed: "Échec de l'import",
    importFileError: "Impossible d'importer le fichier",
    filterAll: "Tous",
    filterActive: "Actifs",
    filterPending: "En attente",
    filterCompleted: "Terminés",
  },
  patientFile: {
    tabInfos: "Informations patient",
    tabReport: "Rapport",
    tabArgos: "ARGOS",
    generateReport: "Générer le rapport",
  },
  layout: {
    tagline: "Aide à la décision clinique",
    clinician: "Clinicien",
    adminDashboard: "Tableau de bord admin",
    patientHandler: "Gestion des patients",
    navPatients: "Patients",
    navArgos: "Espace ARGOS",
    navSettings: "Paramètres",
    navHelp: "Aide",
    navAdmin: "Administration",
    navPatientHandler: "Réaffectation patients",
    sidebarFooter: "ARCANE Phase 1 · Cancers rares",
  },
  settings: {
    title: "Paramètres",
    subtitle: "Compte et préférences de l'application ARCANE.",
    signedInAccount: "Compte connecté",
    signedInDescription: "Informations de votre session actuelle (lecture seule).",
    email: "E-mail",
    role: "Rôle",
    username: "Nom d'utilisateur",
    application: "Application",
    applicationDescription:
      "Les paramètres avancés de profil et de notifications seront ajoutés dans une prochaine version.",
    applicationBody:
      "ARCANE Phase 1 — aide à la décision clinique pour cancers rares. Contactez l'administrateur du laboratoire pour modifier les rôles ou réinitialiser l'accès.",
    backToDashboard: "Retour au tableau de bord",
    roles: {
      admin: "Administrateur",
      clinician: "Clinicien",
    },
  },
} as const;
