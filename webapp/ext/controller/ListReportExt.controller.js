sap.ui.define(
  [
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/m/MessageToast",
    "sap/m/PDFViewer",
  ],
  function (
    _Controller,
    Fragment,
    JSONModel,
    MessageBox,
    MessageToast,
    PDFViewer
  ) {
    "use strict";

    let _sIdPrefix;
    let _footerBar;
    let _oView;
    let _oTable;
    let _oViewModel = new JSONModel({
      editable: false,
      textDescDialogTitle: "",
    });
    let _oScheduleTextDialog;
    let _oTextDescDialog;
    let _oPDFViewer;

    const oController = {
      onInit: function () {
        _sIdPrefix =
          "oup.pms.zpmswbsact::sap.suite.ui.generic.template.ListReport.view.ListReport::ZPMS_C_WBS_ACTIVITIES--";

        // grid table
        _oTable = this.byId(_sIdPrefix + "GridTable");

        // footer bar
        _footerBar = this.byId(_sIdPrefix + "template::FooterToolbar");

        // add visbility
        _footerBar.bindProperty("visible", "oViewModel>/editable");

        // get view instance
        _oView = this.getView();

        // set view model to list report view
        _oView.setModel(_oViewModel, "oViewModel");

        // edit button toggle
        const oEditBtn = this.byId(_sIdPrefix + "edit-btn-idButton");

        // add visbility
        oEditBtn.bindProperty(
          "visible",
          "oViewModel>/editable",
          function (sValue) {
            return !sValue;
          }
        );

        // save button toggle
        const oSaveBtn = this.byId(_sIdPrefix + "save-btn-idButton");
        oSaveBtn.setType("Emphasized");

        // cancel button toggle
        const oCancelBtn = this.byId(_sIdPrefix + "cancel-btn-idButton");
        oCancelBtn.setType("Default");

        // get schedule text button
        const oScheduleTextBtn = this.byId(
          _sIdPrefix + "schedule-txt-btn-idButton"
        );

        // add visbility
        oScheduleTextBtn.bindProperty(
          "visible",
          "oViewModel>/editable",
          function (sValue) {
            return !sValue;
          }
        );

        // pdf viewer
        _oPDFViewer = new PDFViewer();

        // add dependent
        _oView.addDependent(_oPDFViewer);
      },

      onAfterRendering: function () {
        const oContentTable = this.byId(_sIdPrefix + "GridTable");
        oContentTable.attachBusyStateChanged(this._onBusyStateChanged);
      },

      onScheduleOutputImpressionPress: function () {
        this._showPDF(true /* Impression */);
      },

      onScheduleOutputSeriesPress: function () {
        this._showPDF(false /* Impression */);
      },

      onScheduleTextPress: async function () {
        try {
          const oData = this._getSelectedRow();

          if (!_oScheduleTextDialog) {
            // initialize dialog
            _oScheduleTextDialog = await this._loadFragment(
              `oup.pms.zpmswbsact.ext.fragments.ScheduleText`,
              this
            );

            // add view dependent
            _oView.addDependent(_oScheduleTextDialog);
          }

          const dataRequested = () => _oScheduleTextDialog.setBusy(true);
          const dataReceived = () => _oScheduleTextDialog.setBusy(false);

          // bind element for the dialog
          _oScheduleTextDialog.bindElement({
            path: `/ZPMSSCHTEXTSet(Posid='${oData.posid}',Aufnr='${oData.aufnr}')`,
            events: {
              dataRequested,
              dataReceived,
            },
          });

          // open dialog
          _oScheduleTextDialog.open();
        } catch (error) {}
      },

      onScheduleTextDialogCancel: () => _oScheduleTextDialog.close(),

      onScheduleTextDialogSave: () => {
        const fnSuccess = (_) => {
          MessageToast.show("Saved Successfully !");
          _oScheduleTextDialog.close();
        };

        const fnError = (_) => {
          MessageToast.show(`Error - ${_}`);
        };

        _oView.getModel().submitChanges({
          success: fnSuccess,
          error: fnError,
        });
      },

      onPrintNetworkDescPress: function () {
        try {
          const oData = this._getSelectedRow();

          // dynamic dialog title
          _oViewModel.setProperty(
            "/textDescDialogTitle",
            "D Number Subschedule: Print Network Description"
          );

          // Print Network Description
          this._setTextDescBinding("ZPMSDNUMPRINTSet", oData.posid);
        } catch (error) {}
      },

      onAudioVideoDescPress: function () {
        try {
          const oData = this._getSelectedRow();

          // dynamic dialog title
          _oViewModel.setProperty(
            "/textDescDialogTitle",
            "D Number Subschedule: Audio/Video Network Description"
          );

          // Audio/Video Network Description
          this._setTextDescBinding("ZPMSDNUMAVSet", oData.posid);
        } catch (error) {}
      },

      onDigitalNetworkDescPress: function () {
        try {
          const oData = this._getSelectedRow();

          // dynamic dialog title
          _oViewModel.setProperty(
            "/textDescDialogTitle",
            "D Number Subschedule: Digital Network Description"
          );

          // Digital Network Description
          this._setTextDescBinding("ZPMSDNUMDIGSet", oData.posid);
        } catch (error) {}
      },

      onTextDescDialogCancel: () => {
        _oTextDescDialog.close();

        // destroy
        _oTextDescDialog.destroy();

        // reset to empty
        _oTextDescDialog = undefined;
      },

      onTextDescDialogSave: () => {
        const fnSuccess = (_) => {
          MessageToast.show("Saved Successfully !");
          _oTextDescDialog.close();

          // destroy
          _oTextDescDialog.destroy();

          // reset to empty
          _oTextDescDialog = undefined;
        };

        const fnError = (_) => {
          MessageToast.show(`Error - ${_}`);
        };

        _oView.getModel().submitChanges({
          success: fnSuccess,
          error: fnError,
        });
      },

      onEditPress: () => _oViewModel.setProperty("/editable", true),

      onCancelPress: () => {
        if (_oView.getModel().hasPendingChanges()) {
          // display warning message
          MessageBox.warning("Cancel your changes ?", {
            actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
            emphasizedAction: MessageBox.Action.OK,
            styleClass: "sapUiSizeCompact",
            onClose: (sAction) => {
              if (sAction === MessageBox.Action.OK) {
                // cancel the changes by resetting the model
                _oView.getModel().resetChanges();

                // toggle edit property in view model
                _oViewModel.setProperty("/editable", false);
              }
            },
          });
        } else {
          // toggle edit property in view model
          _oViewModel.setProperty("/editable", false);
        }
      },

      onSavePress: async function () {
        try {
          // start busy indicator
          sap.ui.core.BusyIndicator.show(0);

          if (!_oView.getModel().hasPendingChanges()) {
            // display warning message
            MessageBox.information("There are no changes found to save", {
              styleClass: "sapUiSizeCompact",
            });

            throw "no changes found";
          }

          await this._saveChanges();

          // display success message
          MessageBox.success("Data saved successfully!", {
            styleClass: "sapUiSizeCompact",
          });

          // toggle edit property in view model
          _oViewModel.setProperty("/editable", false);

          setTimeout(() => {
            // refresh the model
            _oView.getModel().refresh();

            // end busy indicator
            sap.ui.core.BusyIndicator.hide();
          }, 3000);
        } catch (error) {
          // end busy indicator
          sap.ui.core.BusyIndicator.hide();

          let sMessage = error;

          if (error.responseText) {
            // failed to save changes handler
            const xmlDoc = $.parseXML(error.responseText);
            const $xml = $(xmlDoc);
            sMessage = $xml.find("message")[0].innerHTML;
          }

          // display error message
          MessageBox.error(sMessage, {
            styleClass: "sapUiSizeCompact",
          });
        }
      },

      /* =========================================================== */
      /* internal methods                                            */
      /* =========================================================== */

      _loadFragment: (sPath, _oThis) =>
        new Promise((reslove, reject) =>
          Fragment.load({
            name: sPath,
            controller: _oThis,
          })
            .then((oFragment) => reslove(oFragment))
            .catch((oError) => reject(oError))
        ),

      _onBusyStateChanged: function (oEvent) {
        const bBusy = oEvent.getParameter("busy");

        if (!bBusy) {
          const oTable = oEvent.getSource();
          let oTpc = null;

          // grid table
          if (sap.ui.table.TablePointerExtension) {
            oTpc = new sap.ui.table.TablePointerExtension(oTable);
          } else {
            oTpc = new sap.ui.table.extensions.Pointer(oTable);
          }

          // columns
          const aColumns = oTable.getColumns();
          for (let i = aColumns.length; i >= 0; i--) {
            oTpc.doAutoResizeColumn(i);
          }
        }
      },

      _getSelectedRow: () => {
        const oPlugins = _oTable.getPlugins()[0];
        const iSelectedIndex = oPlugins.getSelectedIndex();
        const oContext = _oTable.getContextByIndex(iSelectedIndex);
        const oData = oContext.getObject() || null;

        return oData;
      },

      _setTextDescBinding: async function (sPath, sPosid) {
        if (!_oTextDescDialog) {
          // initialize dialog
          _oTextDescDialog = await this._loadFragment(
            `oup.pms.zpmswbsact.ext.fragments.TextDesc`,
            this
          );

          // add view dependent
          _oView.addDependent(_oTextDescDialog);
        }

        const dataRequested = () => _oTextDescDialog.setBusy(true);
        const dataReceived = () => _oTextDescDialog.setBusy(false);

        // bind element for the dialog
        _oTextDescDialog.bindElement({
          path: `/${sPath}(Posid='${sPosid}')`,
          events: {
            dataRequested,
            dataReceived,
          },
        });

        // open dialog
        _oTextDescDialog.open();
      },

      _saveChanges: () =>
        new Promise((reslove, reject) => {
          const fnSuccess = (oDataResponse) => {
            try {
              // check for odata response status code
              const oResponse = oDataResponse.__batchResponses[0];

              const bError = parseInt(oResponse.response.statusCode) >= 400;
              if (bError) {
                // error in odata request
                reject(JSON.parse(oResponse.response.body).error.message.value);
              }

              // if no errors, resolve the promise
              reslove(oDataResponse);
            } catch (error) {
              const oChangeResponse =
                oDataResponse.__batchResponses[0].__changeResponses[0];
              const bChangeResponseError =
                parseInt(oChangeResponse.statusCode) >= 400;

              if (!bChangeResponseError) {
                reslove(oDataResponse);
              }

              // error in odata request
              reject("Failed to save the changes");
            }
          };

          const fnError = (oErrorResponse) => {
            reject(oErrorResponse);
          };

          _oView.getModel().submitChanges({
            success: fnSuccess,
            error: fnError,
          });
        }),

      _showPDF: function (bImpression) {
        try {
          const oData = this._getSelectedRow();
          const sTtitle = bImpression
            ? "Schedule Output Impression"
            : "Schedule Output Series";
          const sIdentifier = bImpression ? "I" : "S";
          const sServiceUrl = _oView.getModel().sServiceUrl;
          const sSource = `${sServiceUrl}/PrintPdfSet(Identifier='${sIdentifier}',ImprSeries='${oData.posid}')/$value`;

          // set source
          _oPDFViewer.setSource(sSource);

          // set title
          _oPDFViewer.setTitle(sTtitle);

          // open pdf viewer
          _oPDFViewer.open();
        } catch (error) {
          // error message
          MessageToast.show("Error in loading PDF Viewer");
        }
      },
    };

    return oController;
  }
);
