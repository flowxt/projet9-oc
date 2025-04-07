import { ROUTES_PATH } from "../constants/routes.js";
import Logout from "./Logout.js";

export default class NewBill {
  constructor({ document, onNavigate, store, localStorage }) {
    this.document = document;
    this.onNavigate = onNavigate;
    this.store = store;
    const formNewBill = this.document.querySelector(
      `form[data-testid="form-new-bill"]`
    );
    formNewBill.addEventListener("submit", this.handleSubmit);
    const file = this.document.querySelector(`input[data-testid="file"]`);
    file.addEventListener("change", this.handleChangeFile);
    this.fileUrl = null;
    this.fileName = null;
    this.billId = null;
    new Logout({ document, localStorage, onNavigate });
  }
  handleChangeFile = (e) => {
    e.preventDefault();
    //récupère le fichier sélectionné par l'utilisateur
    //dom element
    const fileInput = this.document.querySelector(`input[data-testid="file"]`);
    //fichier chargé par l'user
    const file = fileInput.files[0];
    //verfier l'extension du fichier
    //initialiser un tableau avec les extensions acceptées
    const allowedExt = ["jpg", "jpeg", "png"];
    //split pour diviser la chaine de caractère en un tableau
    //sépérateur le .
    //ex : document.pdf devient ['document', 'pdf']
    //pop => renvoit le dernier élement du tableau (pdf)
    const fileExt = file.name.split(".").pop().toLowerCase();
    console.log("Extension du fichier:", fileExt);

    //si l'extension n'est pas bonne
    if (!allowedExt.includes(fileExt)) {
      console.error(
        "Fichier invalide, veuillez charger un fichier avec l'extension jpg, jpeg ou png"
      );
      fileInput.value = "";
      return;
    }
    //récupère le nom du fichier à partir du chemin du fichier
    //fileInput.value = "C:\\Users\\Username\\Documents\\image.png"
    //split => string to array : (exp regulière) : ["C:", "Users", "Username", "Documents", "image.png"]
    const filePath = fileInput.value.split(/\\/g);
    //"image.png"
    const fileName = filePath[filePath.length - 1];

    console.log("Chemin du fichier:", filePath);
    console.log("Nom du fichier:", fileName);

    //crée un objet FormData pour envoyer les données du fichier et l'email de l'utilisateur
    const formData = new FormData();
    const email = JSON.parse(localStorage.getItem("user")).email;
    formData.append("file", file);
    formData.append("email", email);

    console.log("Données du form:", formData);

    //appelle une méthode `create` sur un objet `bills` du store pour créer la facture
    this.store
      .bills()
      .create({
        data: formData,
        headers: {
          noContentType: true,
        },
      })
      .then(({ fileUrl, key }) => {
        //affiche l'URL du fichier après sa création
        console.log(fileUrl);
        console.log(key);
        //stocke l'identifiant de la facture créée
        this.billId = key;
        //stocke l'URL du fichier créé
        this.fileUrl = fileUrl;
        //stocke le nom du fichier
        this.fileName = fileName;
      })
      .catch((error) => console.error(error));
  };
  handleSubmit = (e) => {
    e.preventDefault();
    console.log(
      'e.target.querySelector(`input[data-testid="datepicker"]`).value',
      e.target.querySelector(`input[data-testid="datepicker"]`).value
    );
    const email = JSON.parse(localStorage.getItem("user")).email;
    const bill = {
      email,
      type: e.target.querySelector(`select[data-testid="expense-type"]`).value,
      name: e.target.querySelector(`input[data-testid="expense-name"]`).value,
      amount: parseInt(
        e.target.querySelector(`input[data-testid="amount"]`).value
      ),
      date: e.target.querySelector(`input[data-testid="datepicker"]`).value,
      vat: e.target.querySelector(`input[data-testid="vat"]`).value,
      pct:
        parseInt(e.target.querySelector(`input[data-testid="pct"]`).value) ||
        20,
      commentary: e.target.querySelector(`textarea[data-testid="commentary"]`)
        .value,
      fileUrl: this.fileUrl,
      fileName: this.fileName,
      status: "pending",
    };
    this.updateBill(bill);
    this.onNavigate(ROUTES_PATH["Bills"]);
  };
  // not need to cover this function by tests
  updateBill = (bill) => {
    if (this.store) {
      this.store
        .bills()
        .update({ data: JSON.stringify(bill), selector: this.billId })
        .then(() => {
          this.onNavigate(ROUTES_PATH["Bills"]);
        })
        .catch((error) => console.error(error));
    }
  };
}
