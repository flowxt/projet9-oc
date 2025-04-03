/**
 * @jest-environment jsdom
 */

import { screen, fireEvent, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import NewBillUI from "../views/NewBillUI.js";
import NewBill from "../containers/NewBill.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import { ROUTES_PATH } from "../constants/routes.js";
import router from "../app/Router.js";

//import du mockStore avec les mockedBills
import mockStore from "../__mocks__/store.js";

describe("Given I am connected as an employee", () => {
  describe("When I am on NewBill Page", () => {
    //avant chaque test, initialisation
    beforeEach(() => {
      //configuration du localStorage pour simuler l'utilisateur connecté
      Object.defineProperty(window, "localStorage", {
        value: localStorageMock,
      });
      window.localStorage.setItem(
        "user",
        JSON.stringify({
          type: "Employee",
        })
      );

      //création d'un élément root pour simuler le rendu de l'interface
      const root = document.createElement("div");
      root.setAttribute("id", "root");
      document.body.append(root);

      // Exécution du routeur pour simuler la navigation sur la page NewBill
      router();
      window.onNavigate(ROUTES_PATH.NewBill);
    });

    test("Then the new bill form is displayed", () => {
      const html = NewBillUI();
      document.body.innerHTML = html;

      expect(screen.getByTestId("form-new-bill")).toBeTruthy();
      expect(screen.getByTestId("expense-type")).toBeTruthy();
      expect(screen.getByTestId("expense-name")).toBeTruthy();
      expect(screen.getByTestId("datepicker")).toBeTruthy();
      expect(screen.getByTestId("amount")).toBeTruthy();
      expect(screen.getByTestId("vat")).toBeTruthy();
      expect(screen.getByTestId("pct")).toBeTruthy();
      expect(screen.getByTestId("commentary")).toBeTruthy();
      expect(screen.getByTestId("file")).toBeTruthy();
    });
    //handleSubmit test and nav to Bills page
    test("When I submit the form with valid datas, then it should call handleSubmit and navigate back to bills page", () => {
      //générer le html de newbill ui
      document.body.innerHTML = NewBillUI();
      //mock de la fonction onNavigate (simuler le comportement de navigation)
      const onNavigate = jest.fn();

      // utiliser le mock du magasin pour retourner les factures
      const storeMock = {
        bills: mockStore.bills,
      };

      //instanciation de la classe Bills
      const bill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      });

      const handleSubmit = jest.fn(bill.handleSubmit);
      const form = screen.getByTestId("form-new-bill");

      bill.fileUrl = "C:Users/Username/Documents/file.jpg";
      bill.fileName = "file.jpg";

      fireEvent.change(screen.getByTestId("expense-type"), {
        target: { value: "Transports" },
      });
      fireEvent.change(screen.getByTestId("expense-name"), {
        target: { value: "Vol Paris Londres" },
      });
      fireEvent.change(screen.getByTestId("datepicker"), {
        target: { value: "2021-12-01" },
      });
      fireEvent.change(screen.getByTestId("amount"), {
        target: { value: "348" },
      });
      fireEvent.change(screen.getByTestId("vat"), { target: { value: "70" } });
      fireEvent.change(screen.getByTestId("pct"), { target: { value: "20" } });
      fireEvent.change(screen.getByTestId("commentary"), {
        target: { value: "Voyage d'affaires" },
      });

      //écouteur d'évént de soumission au formulaire
      form.addEventListener("submit", handleSubmit);
      //simuler la soumission du formulaire
      fireEvent.submit(form);
      //vérifier que handleSubmit a été appelé
      expect(handleSubmit).toHaveBeenCalled();
      //vérifier que la navigation a eu lieu
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH["Bills"]);
    });
    //tests conditionnés si extension ok, ou extension pas autorisée du fichier chargé par l'utilisateur
    describe("Given I upload a file", () => {
      //init des constantes dont on aura besoin pour les 2 tests
      let storeMock;
      let fileInput;
      let handleChangeFile;
      let bill;
      let consoleErrorSpy;

      beforeEach(() => {
        storeMock = {
          bills: jest.fn(() => ({
            create: jest.fn().mockResolvedValue({
              fileUrl: "https://localhost:3456/images/test.jpg",
              key: "1234",
            }),
            update: jest.fn().mockResolvedValue(),
          })),
        };

        window.localStorage.setItem(
          "user",
          JSON.stringify({
            type: "Employee",
            email: "employee@test.com",
          })
        );

        //générer le HTML de NewBill UI
        document.body.innerHTML = NewBillUI();

        //mock de la fonction onNavigate (simuler le comportement de navigation)
        const onNavigate = jest.fn();

        //instanciation de la classe NewBill
        bill = new NewBill({
          document,
          onNavigate,
          store: storeMock,
          localStorage: window.localStorage,
        });

        //sélection de l'élément d'entrée de fichier
        fileInput = screen.getByTestId("file");

        //création d'une fonction mockée basée sur la méthode handleChangeFile
        handleChangeFile = jest.fn(bill.handleChangeFile);
        fileInput.addEventListener("change", handleChangeFile);

        //initialisation de consoleErrorSpy pour le display de console.error
        consoleErrorSpy = jest
          .spyOn(console, "error")
          .mockImplementation(() => {});
      });

      test("it should submit when I upload a file with an allowed extension", async () => {
        //simulation du téléchargement d'un fichier avec une extension valide (jpg, jpeg, png)
        const file = new File(["foo"], "foo.jpg", { type: "image/jpeg" });
        //utilisation de userEvent ou fireEvent pour télécharger le fichier
        userEvent.upload(fileInput, file);

        console.log("Fichier chargé avant le submit");

        //soumission du formulaire ou déclenchement de l'événement de soumission
        fireEvent.submit(screen.getByTestId("form-new-bill"));

        //attendre que toutes les opérations asynchrones soient terminées
        await waitFor(() => {
          //vérification que la méthode handleChangeFile a été appelée après le téléchargement du fichier
          expect(handleChangeFile).toHaveBeenCalled();
          //vérification que la console n'affiche par de message d'erreur
          expect(consoleErrorSpy).not.toHaveBeenCalled();
        });
      });
      test("it should display an error message when I upload a file with a non-allowed extension", async () => {
        //simulation du téléchargement d'un fichier avec une extension non autorisée (ex: txt)
        const file = new File(["foo"], "foo.txt", { type: "text/plain" });
        // Utilisation de userEvent ou fireEvent pour télécharger le fichier
        userEvent.upload(fileInput, file);

        //soumission du formulaire ou déclenchement de l'événement de soumission
        fireEvent.submit(screen.getByTestId("form-new-bill"));

        //attendre que toutes les opérations asynchrones soient terminées
        await waitFor(() => {
          //vérification que la méthode handleChangeFile a été appelée après le téléchargement du fichier
          expect(handleChangeFile).toHaveBeenCalled();
          //vérification que la console a affiché le message d'erreur attendu
          expect(consoleErrorSpy).toHaveBeenCalled();
          // expect(consoleErrorSpy.mock.calls[0][0]).toContain("Fichier invalide");
        });

        //vérification que le formulaire n'a pas été soumis en raison de l'extension incorrecte
        expect(storeMock.bills().create).not.toHaveBeenCalled();
      });
    });

    //test error 404 & 500
  });
});
