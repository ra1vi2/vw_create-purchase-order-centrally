sap.ui.define([
	"sap/ui/core/Fragment",
	"sap/m/MessageBox",
	"sap/m/MessageToast",
	"vwks/nlp/s2p/mm/pocentral/create/ext/util/Constants",
	"sap/ui/model/json/JSONModel",
	"vwks/nlp/s2p/mm/reuse/lib/util/NavigationHelper"
], function (Fragment, MessageBox, MessageToast, Constants, JSONModel,
	NavigationHelper) {
	"use strict";

	return sap.ui.controller("vwks.nlp.s2p.mm.pocentral.create.ext.controller.ObjectPageExt", {

		/**
		 * Event handler for Object Page controller.
		 * Attach page data loaded event listener.
		 * @public
		 */
		onInit: function () {
			this.extensionAPI.attachPageDataLoaded(this.onPageDataLoad.bind(this));
			this.extensionAPI.getTransactionController().attachAfterCancel(this.onCancelBtnPress.bind(this));
			this.extensionAPI.getTransactionController().attachAfterSave(this.fireAfterSave.bind(this));

			this._oSaveBtn = this.getView().byId(
				"vwks.nlp.s2p.mm.pocentral.create::sap.suite.ui.generic.template.ObjectPage.view.Details::xVWKSxNLP_PO_C_PRFODDraftHdr--save");
			this._oFooterToolbar = sap.ui.getCore().byId(
				"vwks.nlp.s2p.mm.pocentral.create::sap.suite.ui.generic.template.ObjectPage.view.Details::xVWKSxNLP_PO_C_PRFODDraftHdr--template::ObjectPage::FooterToolbar"
			);

			this.initCustomMsgBtnPopover();
			this.initCustomMsgHandling();

			//i18n Resource model
			var oi18nModel = this.getOwnerComponent().getModel("i18n");
			if (oi18nModel) {
				this._oResourceBundle = oi18nModel.getResourceBundle();
			}

			var oModel = new JSONModel();
			this.getView().setModel(oModel, "viewSettings");

			var oMassChangeModel = new JSONModel({
				massChangeSelection: "",
				massChangeInput: ""
			});

			this.getView().setModel(oMassChangeModel, "massChangeDialogModel");
			this._oItemsTable = this.getView().byId(
				"vwks.nlp.s2p.mm.pocentral.create::sap.suite.ui.generic.template.ObjectPage.view.Details::xVWKSxNLP_PO_C_PRFODDraftHdr--Items::responsiveTable"
			);

			if (this._oItemsTable) {
				this._oItemsTable.attachEvent("selectionChange", this.onItemsTableSelectionChange.bind(this));
				this._oItemsTable.attachEvent("updateFinished", this.onItemsTableSelectionChange.bind(this));
			}
		},
		/**
		 * Initialize model for the custom message button.
		 * In case model exists - set initial data.
		 */
		initCustomMsgHandling: function () {
			var oModel = this.getView().getModel("messageModel");
			var oInitialData = {
				messages: 0
			};
			if (oModel) {
				oModel.setData(oInitialData);
			} else {
				oModel = new JSONModel(oInitialData);
				this.getView().setModel(oModel, "messageModel");
			}
		},

		/**
		 * Initialize custom message button and custom message popover.
		 * It helps to handle FI errors.
		 */
		initCustomMsgBtnPopover: function () {
			sap.ui.xmlfragment("idToolbarButton", "vwks.nlp.s2p.mm.pocentral.create.ext.fragments.CustomToolbarButton", this);
			this._oCustomMsgBtn = Fragment.byId("idToolbarButton", "idCreatePoErrorBtn");

			this._oFooterToolbar.insertContent(this._oCustomMsgBtn, Constants.MSG_BTN_POSITION);
			sap.ui.xmlfragment("idMessagePopOver", "vwks.nlp.s2p.mm.pocentral.create.ext.fragments.MessagePopover", this);

			this._oCustomMessagePopover = Fragment.byId("idMessagePopOver", "idMessagePopverDialog");

			this.getView().addDependent(this._oCustomMessagePopover);
		},

		/**
		 * Custom message button press event handler.
		 * @param {sap.ui.base.Event} oEvent The event object
		 */
		onCustomMessageBtnPress: function (oEvent) {
			if (this._oCustomMessagePopover) {
				this._oCustomMessagePopover.openBy(oEvent.getSource());
			}
		},
		onPageDataLoad: function () {
			this.setViewEditable(true);
		},

		/**
		 * Change Items press event handler.
		 * @param {sap.ui.base.Event} oEvent event object
		 * @public
		 */
		onClickMassChangeBtn: function (oEvent) {
			if (!this._oMassChangeDialog) {
				this.sIdMassChangeDialog = this.createId("MassChangeDialog");
				this._oMassChangeDialog = sap.ui.xmlfragment(this.sIdMassChangeDialog,
					"vwks.nlp.s2p.mm.pocentral.create.ext.fragments.MassChangeDialog", this);
				this.getView().addDependent(this._oMassChangeDialog);
			}
			this._oMassChangeDialog.open();
		},

		/**
		 * Return OData model.
		 * @return {sap.ui.model.odata.v2.ODataModel} OData Model 
		 */
		getODataModel: function () {
			return this.getView().getModel();
		},

		/**
		 * Navigate to MPRC application.
		 */
		navigateToManagePRApplication: function () {
			this.getView().setBusy(true);
			NavigationHelper.navigateToExternalApp(this, "MPRC");
			this.getView().setBusy(false);
		},

		/**
		 * Add message to custom message popover.
		 * @param {object[]} aMessages array of messages
		 * @public
		 */
		addMessageToCustomMsgPopover: function (aMessages) {
			var aMessagesText = aMessages.map(function (oMessg) {
				return {
					message: oMessg.message
				};
			});
			var oMessageModel = this.getView().getModel("messageModel");
			oMessageModel.setProperty("/messages", aMessagesText);

			this._oCustomMessagePopover.setModel(oMessageModel, "messageModel");
			this._oCustomMsgBtn.firePress();
		},

		/**
		 * Handle errors for FI call.
		 * Show errors in custom message popover.
		 * @param {object} oResponse response data object
		 */
		handleFIError: function (oResponse) {
			var aMessages;
			this.setViewEditable(true);
			this.getView().setBusy(false);

			if (oResponse.headers["sap-message"]) {
				aMessages = JSON.parse(oResponse.headers["sap-message"]).details;
			} else if (oResponse.responseText) {
				aMessages = JSON.parse(oResponse.responseText).error.innererror.errordetails;
			}
			this.addMessageToCustomMsgPopover(aMessages);
		},

		/**
		 * Handler method for Mass change Apply
		 * @param {sap.ui.base.Event} oEvent The event object
		 * @public
		 */
		onApplyMassChange: function (oEvent) {
			var aSelectedItems = this._oItemsTable.getSelectedItems();
			if (aSelectedItems.length) {
				var sMassChangeField = this.getView().getModel("massChangeDialogModel").getProperty("/massChangeSelection");
				var sMassChangeInputValue = this.getView().getModel("massChangeDialogModel").getProperty("/massChangeInput");

				this.getView().setBusy(true);

				for (var iInd = 0; iInd < aSelectedItems.length; iInd++) {
					if (aSelectedItems[iInd].getBindingContext()) {
						var oItem = aSelectedItems[iInd].getBindingContext().getObject();
						var oMassChangeTableRow = {
							PurReqnFllwOnDocDrftHdrUUID: oItem.PurReqnFllwOnDocDrftHdrUUID,
							PurReqnFllwOnDocDrftItmUUID: oItem.PurReqnFllwOnDocDrftItmUUID,
							TargetTableField: sMassChangeField,
							TargetTableFieldValue: sMassChangeInputValue
						};
						this.getODataModel().callFunction("/UpdateDraft", {
							method: "POST",
							urlParameters: oMassChangeTableRow,
							success: this.successMassChange.bind(this),
							error: this.handleFIError.bind(this)
						});
					}
				}

				this.getView().getModel("massChangeDialogModel").setProperty("/massChangeSelection", "");
				this.getView().getModel("massChangeDialogModel").setProperty("/massChangeInput", "");
			}
			this._oMassChangeDialog.close();
		},

		/**
		 * Success handler for Mass change action.
		 * @param {object} oResponse response data object
		 */
		successMassChange: function (oResponse) {
			if (this._oItemsTable.getBinding("items")) {
				this._oItemsTable.getBinding("items").refresh();
			}
			this.getView().setBusy(false);
		},

		/**
		 * Close Mass Change Dialog button press event handler.
		 * @public
		 */
		onCloseMassChangeDialog: function () {
			var oMassChangeModel = this.getView().getModel("massChangeDialogModel");
			oMassChangeModel.setProperty("/massChangeSelection", "");
			oMassChangeModel.setProperty("/massChangeInput", "");
			this._oMassChangeDialog.destroy();
			this._oMassChangeDialog = "";
		},

		/*
		 * This method enables/disables Change Items button.
		 * If at least one item is selected, button is enabled.
		 * @public
		 */
		onItemsTableSelectionChange: function () {
			var oChangeItemsBtn = this.getView().byId("MassChangeBtn");
			var aSelectedItems = this._oItemsTable.getSelectedItems();
			if (aSelectedItems.length) {
				oChangeItemsBtn.setEnabled(true);
			} else {
				oChangeItemsBtn.setEnabled(false);
			}
		},

		/**
		 * Show success message.
		 * @param {string} sMessage error message
		 * @param {object} fnClose function that should be fired after press 'ok'
		 */
		showSuccessMessageBox: function (sMessage, fnClose) {
			MessageBox.success(sMessage, {
				icon: MessageBox.Icon.SUCCESS,
				actions: MessageBox.Action.OK,
				onClose: fnClose || null
			});
		},
		/**
		 * Show success message.
		 * @param {string} sMessage error message
		 */
		showSuccessMessageToast: function (sMessage) {
			MessageToast.show(sMessage);
			this.setViewEditable(true);
		},

		/**
		 * Set editable state for the view.
		 * @param {boolean} bSetViewEditable true - set editable state
		 * @public
		 */
		setViewEditable: function (bSetViewEditable) {
			this.getView().getModel("ui").setProperty("/editable", bSetViewEditable);
		},

		/**
		 * Save with Status Held button press event handler.
		 * @param {sap.ui.base.Event} oEvent event object
		 * @public
		 */
		onSaveWithStatusHeldBtnPress: function (oEvent) {
			this.getView().getModel("viewSettings").setProperty("/clickedBtnType", Constants.BUTTON_BUSINESS_TYPE.STATUS_HELD);
			this._oSaveBtn.firePress();
		},

		/**
		 * Process in Expert Mode button press event handler.
		 * @param {sap.ui.base.Event} oEvent event object
		 * @public
		 */
		onProcessInExpertModeBtnPress: function (oEvent) {
			this.getView().getModel("viewSettings").setProperty("/clickedBtnType", Constants.BUTTON_BUSINESS_TYPE.STATUS_EXPERT);
			MessageBox.confirm(this._oResourceBundle.getText("ExpertModeNavigationTempMsg"), {
				onClose: function (oAction) {
					if (oAction === MessageBox.Action.OK) {
						this._oSaveBtn.firePress();
					}
				}.bind(this)
			});
		},

		/**
		 * Fire after standard 'Save' action.
		 * @param {sap.ui.base.Event} oEvent event object
		 * @public
		 */
		fireAfterSave: function (oEvent) {
			this.initCustomMsgHandling();
			oEvent.saveEntityPromise
				.then(function () {
					this.continueAfterSave();
				}.bind(this));
		},

		/**
		 * Continue perform FI call after standard 'Save' action.
		 */
		continueAfterSave: function () {
			var sClickedBtnType = this.getView().getModel("viewSettings").getProperty("/clickedBtnType") || Constants.BUTTON_BUSINESS_TYPE.ORDER;
			switch (sClickedBtnType) {
			case Constants.BUTTON_BUSINESS_TYPE.ORDER:
				this.continueSaveOrder("");
				break;
			case Constants.BUTTON_BUSINESS_TYPE.STATUS_HELD:
				this.continueSaveOrder("X");
				break;
			case Constants.BUTTON_BUSINESS_TYPE.STATUS_EXPERT:
				this.continueSaveExpertMode();
				break;
			default:
				this.continueSaveOrder("");
			}
		},

		/**
		 * Fire 'CreatePurchaseOrder' FI.
		 * @param {string} sPurchasingCompletenessStatus PurchasingCompletenessStatus value
		 */
		continueSaveOrder: function (sPurchasingCompletenessStatus) {
			this.getView().setBusy(true);
			var sPurReqnFllwOnDocDrftHdrUUID = this.getView().getBindingContext().getObject("PurReqnFllwOnDocDrftHdrUUID");
			var oPayload = {
				PurReqnFllwOnDocDrftHdrUUID: sPurReqnFllwOnDocDrftHdrUUID,
				PurchasingCompletenessStatus: sPurchasingCompletenessStatus
			};
			this.getODataModel().callFunction("/CreatePurchaseOrder", {
				method: "POST",
				urlParameters: oPayload,
				success: this.successCreatePO.bind(this),
				error: this.handleFIError.bind(this)
			});
		},

		/**
		 * Fire 'CreatePOExpert' FI.
		 */
		continueSaveExpertMode: function () {
			this.getView().setBusy(true);
			var oPayload = {
				"PurReqnFllwOnDocDrftHdrUUID": this.getView().getBindingContext().getObject("PurReqnFllwOnDocDrftHdrUUID")
			};
			this.getODataModel().callFunction("/CreatePOExpert", {
				method: "POST",
				urlParameters: oPayload,
				success: this.successCreatePOExpert.bind(this),
				error: this.handleFIError.bind(this)
			});
		},

		/**
		 * Success create PO handler.
		 * Fire navigation to MPRC app.
		 * @param {object} oResponse response data
		 */
		successCreatePO: function (oResponse) {
			var fnCloseHandler = function () {
				this.navigateToManagePRApplication();
			}.bind(this);
			this.showSuccessMessageBox(this._oResourceBundle.getText("SuccessCreatePOMsg", oResponse.PurchaseOrder), fnCloseHandler);

			this.setViewEditable(true);
			this.getView().setBusy(false);
		},

		/**
		 * Delete current PO and open web gui screen to procees in Expert mode (standard app functionality).
		 * @param {object} oData data object
		 * @param {object} oResponse response object
		 */
		successCreatePOExpert: function (oData, oResponse) {
			this.setViewEditable(true);
			this.getView().setBusy(false);
			if (oData.PurgDocNavgnCntxtUUID !== "") {
				this.removeCurrentPO();
				this.navigateToManagePRApplication();
				this.navigateToGUI(oData, oResponse);
			} else {
				this.handleFIError(oResponse);
			}
		},

		/**
		 * Navigate to GUI (standard app functionality adjusted).
		 * @param {object} oData data object
		 * @param {object} oResponse response object
		 */
		navigateToGUI: function (oData, oResponse) {

			var oParams;
			if (oData.IsCloud === "X") {
				oParams = {
					TransactionParameters: oData.Parameters,
					BusinessSystemId: oData.Destination,
					Transaction: oData.TransactionCode
				};
			} else {
				oParams = {
					"sap-system": oData.Destination,
					PurgDocNavgnCntxtUUID: oData.PurgDocNavgnCntxtUUID
				};
			}

			//Navigate to PO in GUI
			NavigationHelper.navigateToExternalApp(this, "PO_GUI", null, oParams, true);
		},

		/**
		 * This method is fired after standard 'Create' handler.
		 * @param {sap.ui.base.Event} oEvent event object
		 * @public
		 */
		onCancelBtnPress: function (oEvent) {
			this.removeCurrentPO();
		},

		/**
		 * Remove current PO entry.
		 */
		removeCurrentPO: function () {
			this.getView().setBusy(true);
			var sPath = this.getODataModel().createKey("/xVWKSxNLP_PO_C_PRFODDraftHdr", {
				PurReqnFllwOnDocDrftHdrUUID: this.getView().getBindingContext().getObject("PurReqnFllwOnDocDrftHdrUUID")
			});
			this.getView().setBusy(true);
			this.getODataModel().remove(sPath, {
				success: this.successDeletePO.bind(this),
				error: this.handleFIError.bind(this)
			});
		},

		/**
		 * Success 'Delete PO' handler.
		 */
		successDeletePO: function () {
			this.showSuccessMessageToast(this._oResourceBundle.getText("SuccessDeletePOMsg"));
			this.navigateToManagePRApplication();
			this.setViewEditable(true);
			this.getView().setBusy(false);
		}
	});
});