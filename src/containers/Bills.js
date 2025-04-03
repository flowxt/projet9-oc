import { ROUTES_PATH } from "../constants/routes.js";
import { formatDate, formatStatus } from "../app/format.js";
import Logout from "./Logout.js";

export default class {
  constructor({ document, onNavigate, store, localStorage }) {
    this.document = document;
    this.onNavigate = onNavigate;
    this.store = store;
    // Initialisation des événements pour le bouton "Nouvelle note de frais"
    const buttonNewBill = document.querySelector(
      `button[data-testid="btn-new-bill"]`
    );
    if (buttonNewBill)
      buttonNewBill.addEventListener("click", this.handleClickNewBill);
    // Initialisation des événements pour les icônes "œil"
    const iconEye = document.querySelectorAll(`div[data-testid="icon-eye"]`);
    if (iconEye)
      iconEye.forEach((icon) => {
        icon.addEventListener("click", () => this.handleClickIconEye(icon));
      });
    new Logout({ document, localStorage, onNavigate });
  }

  // Gestion du clic sur le bouton "Nouvelle note de frais"
  handleClickNewBill = () => {
    this.onNavigate(ROUTES_PATH["NewBill"]);
  };

  // Gestion du clic sur l'icône "œil" pour afficher le justificatif
  handleClickIconEye = (icon) => {
    const billUrl = icon.getAttribute("data-bill-url");
    const imgWidth = Math.floor($("#modaleFile").width() * 0.5);
    $("#modaleFile")
      .find(".modal-body")
      .html(
        `<div style='text-align: center;' class="bill-proof-container"><img width=${imgWidth} src=${billUrl} alt="Bill" /></div>`
      );
    $("#modaleFile").modal("show");
  };

  // Récupération et traitement des notes de frais
  getBills = () => {
    if (this.store) {
      return this.store
        .bills()
        .list()
        .then((snapshot) => {
          // 1. Création d'un tableau initial avec les données brutes
          // On garde les dates et statuts non formatés pour le tri
          const bills = snapshot.map((doc) => ({
            ...doc,
            date: doc.date,
            status: doc.status,
          }));

          // 2. Tri des factures par date décroissante (plus récentes en premier)
          // On utilise les dates brutes pour un tri correct
          bills.sort((a, b) => new Date(b.date) - new Date(a.date));

          // 3. Formatage des dates et statuts pour l'affichage
          // Cette étape est faite après le tri pour ne pas affecter l'ordre
          return bills.map((doc) => {
            try {
              return {
                ...doc,
                date: formatDate(doc.date),
                status: formatStatus(doc.status),
              };
            } catch (e) {
              // Gestion des erreurs si les données sont corrompues
              // On garde la date brute et on formate uniquement le statut
              console.log(e, "for", doc);
              return {
                ...doc,
                date: doc.date,
                status: formatStatus(doc.status),
              };
            }
          });
        });
    }
  };
}
