const addFilter = wp.hooks.addFilter;

const Hub_Block_Extended = function ( BlockEdit ) {
	return function ( props ) {
		if ( props.name !== 'core/paragraph' ) {
			return BlockEdit( props );
		}

		return [
			wp.element.createElement(
				wp.blockEditor.BlockControls,
				null,
				wp.element.createElement(
					wp.components.ToolbarButton,
					{
						icon: 'hub-logo',
						label: 'HUB AI',
						onClick: function () {
							jQuery.confirm( {
								columnClass: 'lqd-updates',
								//type: 'dark',
								title: 'Hub AI <div id="hub-ai-modal-ripple" class="lds-ripple" style="position:relative;left:10px;top:-6px"><div></div><div></div></div>',
								content: `
											<p>Explain to Hub AI what you want to do. Keep it short.</p>
											<input id="hub-ai-gutenberg-prompt" style="width:99%;padding:1em;border-color:99%" placeholder="Enter prompt..." type="text" required />
											<p>Examples:</p>
											<div class="hub-ai-examples">
											<span>summarize</span>
											<span>translate to Spanish</span>
											<span>fix the grammer</span>
											<span>make more creative</span>
											</div>`,
								closeIcon: true,
								closeIconClass: 'dashicons dashicons-no',
								buttons: {
									new: {
										btnClass: 'btn-blue',
										text: 'Confirm →',
										action: function () {
											var $modal = this;
											jQuery( '#hub-ai-modal-ripple' ).css( 'display', 'inline' );
											jQuery.post( ajaxurl, { action: 'hub_ai_gutenberg', data: { prompt: jQuery( '#hub-ai-gutenberg-prompt' ).val(), content: props.attributes.content, clientId: props.clientId } }, function ( response ) {
												if ( response.error ) {
													alert( response.message );
												} else {
													wp.data.dispatch( 'core/block-editor' ).updateBlockAttributes( props.clientId, { content: response.output } );
													$modal.close();
													hub_ai_add_log( response.total_tokens );
												}
											} );
											// prevent the modal from closing
											return false;
										}
									},
								}
							} );
							//console.log(props);
						}
					}
				)
			),
			BlockEdit( props )
		];
	};

}
addFilter( 'editor.BlockEdit', 'your-namespace', Hub_Block_Extended );

// Logging actions
function hub_ai_add_log( message ) {
	jQuery.ajax( {
		url: ajaxurl,
		type: 'POST',
		data: {
			action: 'hub_ai_add_log',
			log: hub_ai_get_log_time() + message,
		},
		success: function ( data ) {
			//console.log(data.message);
		}
	} );
}

function hub_ai_get_log_time() {
	let date = new Date().toLocaleString();
	return '[' + date + '] - ';
}