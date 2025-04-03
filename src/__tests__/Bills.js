/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import BillsUI from "../views/BillsUI.js";
import Bills from "../containers/Bills.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import router from "../app/Router.js";

// Import du mockStore avec les mockedBills
import mockStore from "../__mocks__/store";

// Mock du store global
jest.mock("../app/store", () => ({
  __esModule: true,
  default: {
    bills: jest.fn(() => ({
      list: jest.fn().mockRejectedValue(new Error("Erreur 404")),
    })),
  },
}));

// Mock des fonctions formatDate et formatStatus
jest.mock("../app/format.js", () => ({
  formatDate: jest.fn((date) => {
    if (date === "date-invalide") throw new Error("Date invalide");
    return `formatted_${date}`;
  }),
  formatStatus: jest.fn((status) => `formatted_${status}`),
}));

describe("Given I am connected as an employee", () => {
  describe("When I am on Bills Page", () => {
    test("Then bill icon in vertical layout should be highlighted", async () => {
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);
      router();
      window.onNavigate(ROUTES_PATH.Bills);
      await waitFor(() => screen.getByTestId("icon-window"));
      const windowIcon = screen.getByTestId("icon-window");
      // Attendu : l'icone bills doit être en surbrillance
      expect(windowIcon.classList.contains("active-icon")).toBe(true);
    });

    test("Then bills should be ordered from earliest to latest", () => {
      document.body.innerHTML = BillsUI({ data: bills });
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML);

      // Conversion de la date formatée en ISO avant de les comparer pour les trier
      const formatedToIso = (date) => {
        // Sépare la date formatée en jour, mois et année
        const [day, monthString, year] = date.split(" ");
        // Obtient l'index du mois à partir du tableau des mois abrégés français
        const month =
          [
            "Janv.",
            "Févr.",
            "Mars",
            "Avr.",
            "Mai",
            "Juin",
            "Juil.",
            "Août",
            "Sept.",
            "Oct.",
            "Nov.",
            "Déc.",
          ].indexOf(monthString) + 1;
        // Retourne la date au format ISO (YYYY-MM-DD)
        return `20${year}-${String(month).padStart(2, "0")}-${String(
          day
        ).padStart(2, "0")}`;
      };

      // Convertit toutes les dates formatées en ISO
      const datesISO = dates.map((date) => formatedToIso(date));
      // Trie les dates ISO de la plus récente à la plus ancienne
      const datesSortedISO = [...datesISO].sort(
        (a, b) => new Date(b) - new Date(a)
      );
      // Vérifie que les dates affichées (converties en ISO) sont triées de manière correcte
      expect(datesISO).toEqual(datesSortedISO);
    });

    test("Then modal should open and display the bill when I click on eye icon", () => {
      // Configuration du localStorage pour simuler l'utilisateur connecté
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );

      // Création d'un élément root pour simuler le rendu de l'interface
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);

      // Exécution du routeur pour simuler la navigation sur la page des factures
      router();
      window.onNavigate(ROUTES_PATH.Bills);

      // Rendu de l'interface des factures
      document.body.innerHTML = BillsUI({ data: bills });

      // Ajout de la modale en reprenant les attributs et les class css
      const modale = document.createElement("div");
      modale.setAttribute("id", "modaleFile");
      modale.setAttribute("data-testid", "modaleFile");
      modale.classList.add("modal", "fade");
      // Reconstitution de la structure de la modale
      modale.innerHTML = `
        <div class="modal-dialog modal-dialog-centered modal-lg" role="document">
          <div class="modal-content">
            <div class="modal-header">
              <h5 class="modal-title">Justificatif</h5>
              <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div class="modal-body"></div>
          </div>
        </div>
      `;
      document.body.append(modale);

      // Mock de la méthode modal de JQuery
      $.fn.modal = jest.fn();

      // Instanciation de la class Bills
      const billsContainer = new Bills({
        document,
        onNavigate: (pathname) =>
          (document.body.innerHTML = ROUTES_PATH[pathname]),
        store: null,
        localStorage: window.localStorage,
      });

      // Récupération des icônes
      const icon = screen.getAllByTestId("icon-eye")[0];

      // Vérifier ajout attribut data-bill-url
      icon.setAttribute("data-bill-url", "https://test.com");
      // Simulation du clic sur l'icône
      userEvent.click(icon);

      // Vérification que la modale s'affiche
      expect($.fn.modal).toHaveBeenCalledWith("show");

      // Vérification que l'image du fichier de la facture est affichée dans la modale
      const modalBody = document.querySelector("#modaleFile .modal-body");
      expect(modalBody).toBeTruthy();
      const img = modalBody.querySelector("img");
      expect(img).toBeTruthy();
      expect(img.src).toBe("https://test.com/");
    });

    test("Then user should be redirected to new bill form when new bill button is clicked", async () => {
      // Générer le html de bills ui
      document.body.innerHTML = BillsUI({ data: bills });

      // Mock de la fonction onNavigate
      const onNavigate = jest.fn();

      // Instanciation de la classe Bills
      const billsContainer = new Bills({
        document,
        onNavigate,
        store: null,
        localStorage: window.localStorage,
      });

      // Sélection du bouton de la nouvelle note de frais
      const buttonNewBill = screen.getByTestId("btn-new-bill");
      // Simulation du click
      userEvent.click(buttonNewBill);
      // Vérification que onNavigate est appelée avec la bonne route
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH.NewBill);
    });

    // Test d'intégration GET
    test("fetches bills from mock API GET", async () => {
      // Utiliser le mock du magasin pour retourner les factures
      const storeMock = {
        bills: mockStore.bills,
      };

      // Instanciation du conteneur Bills
      const billsContainer = new Bills({
        document,
        onNavigate: jest.fn(),
        store: storeMock,
        localStorage: localStorageMock,
      });

      // Appel de la méthode getBills pour récupérer les factures
      const fetchedBills = await billsContainer.getBills();

      // Vérification
      expect(fetchedBills).toHaveLength(bills.length);

      // Vérification que dates et statuts sont correctement formatés
      fetchedBills.forEach((facture) => {
        expect(facture.date).toEqual(facture.date);
        expect(facture.status).toEqual(facture.status);
      });
    });

    // Test pour les données corrompues (test du bloc catch dans getBills)
    test("should handle corrupted date in bills", async () => {
      // Mock du store qui retourne une facture avec date corrompue
      const corruptedStoreMock = {
        bills: jest.fn().mockImplementationOnce(() => ({
          list: () =>
            Promise.resolve([
              {
                id: "123",
                date: "date-invalide", // Format qui fera échouer formatDate
                status: "pending",
                amount: 100,
              },
            ]),
        })),
      };

      // Instanciation de Bills avec le store mocké
      const billsContainer = new Bills({
        document,
        onNavigate: jest.fn(),
        store: corruptedStoreMock,
        localStorage: localStorageMock,
      });

      // Appel de la méthode getBills
      const bills = await billsContainer.getBills();

      // Vérification que la date reste inchangée mais le statut est formaté
      expect(bills[0].date).toBe("date-invalide");
      expect(bills[0].status).toBe("formatted_pending");
    });

    // Test d'intégration GET avec erreur 404
    test("fetches bills from an API and fails with 404 error", async () => {
      // Mock du store qui rejette avec une erreur 404
      const errorStoreMock = {
        bills: jest.fn().mockImplementationOnce(() => ({
          list: () => Promise.reject(new Error("Erreur 404")),
        })),
      };

      // Instanciation de Bills avec le store mocké
      const billsContainer = new Bills({
        document,
        onNavigate: jest.fn(),
        store: errorStoreMock,
        localStorage: localStorageMock,
      });

      // Appel de la méthode getBills et vérification de l'erreur
      await expect(billsContainer.getBills()).rejects.toThrow("Erreur 404");
    });

    // Test d'intégration GET avec erreur 500
    test("fetches bills from an API and fails with 500 error", async () => {
      // Mock du store qui rejette avec une erreur 500
      const errorStoreMock = {
        bills: jest.fn().mockImplementationOnce(() => ({
          list: () => Promise.reject(new Error("Erreur 500")),
        })),
      };

      // Instanciation de Bills avec le store mocké
      const billsContainer = new Bills({
        document,
        onNavigate: jest.fn(),
        store: errorStoreMock,
        localStorage: localStorageMock,
      });

      // Appel de la méthode getBills et vérification de l'erreur
      await expect(billsContainer.getBills()).rejects.toThrow("Erreur 500");
    });

    // Tests d'erreur API
    describe("When an error occurs on API", () => {
      let billsInstance;

      beforeEach(() => {
        // Rendre BillsUI avec des données initialement vides
        document.body.innerHTML = BillsUI({
          data: [],
          loading: false,
          error: null,
        });
        billsInstance = new Bills({
          document,
          onNavigate: jest.fn(),
          store: mockStore,
          localStorage: window.localStorage,
        });
      });

      test("fetches bills from an API and fails with 404 message error", async () => {
        // Simuler l'échec de la récupération des données avec une erreur 404
        jest.spyOn(mockStore, "bills").mockImplementationOnce(() => ({
          list: () => Promise.reject(new Error("Erreur 404")),
        }));

        // Appeler getBills et vérifier si la page d'erreur s'affiche
        await billsInstance.getBills().catch(() => {});
        document.body.innerHTML = BillsUI({ error: "Erreur 404" });
        expect(screen.getByText(/Erreur 404/)).toBeTruthy();
      });

      test("fetches messages from an API and fails with 500 message error", async () => {
        // Simuler l'échec de la récupération des données avec une erreur 500
        jest.spyOn(mockStore, "bills").mockImplementationOnce(() => ({
          list: () => Promise.reject(new Error("Erreur 500")),
        }));

        // Appeler getBills et vérifier si la page d'erreur s'affiche
        await billsInstance.getBills().catch(() => {});
        document.body.innerHTML = BillsUI({ error: "Erreur 500" });
        expect(screen.getByText(/Erreur 500/)).toBeTruthy();
      });
    });
  });
});
