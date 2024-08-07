sap.ui.define([
	"vwks/nlp/s2p/mm/reuse/lib/util/NavigationHelper"
], function (NavigationHelper) {
	"use strict";

 	return sap.ui.controller("vwks.nlp.s2p.mm.pocentral.create.ext.controller.ListReportExt", {
		
		/**
		 * Event handler for ListReport Page controller.
		 * Attach route pattern matched event listener.
		 * @public
		 */
		onInit: function () {
			var oRouter = sap.ui.core.UIComponent.getRouterFor(this.getView().getController());
			oRouter.attachRoutePatternMatched(this.onPatternMatched.bind(this));
		},
		
		/**
		 * Route pattern matched event handler.
		 * Navigate to MPRC app.
		 * @public
		 */
		onPatternMatched: function () {
			NavigationHelper.navigateToExternalApp(this, "MPRC");
		}
	});
});