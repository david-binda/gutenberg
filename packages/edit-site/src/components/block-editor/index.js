/**
 * WordPress dependencies
 */
import { useSelect, useDispatch } from '@wordpress/data';
import {
	useCallback,
	useState,
	useEffect,
	createPortal,
} from '@wordpress/element';
import { useEntityBlockEditor } from '@wordpress/core-data';
import {
	BlockEditorProvider,
	BlockEditorKeyboardShortcuts,
	__experimentalLinkControl,
	BlockInspector,
	WritingFlow,
	ObserveTyping,
	BlockList,
	BlockSelectionClearer,
	__experimentalUseResizeCanvas as useResizeCanvas,
} from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import NavigateToLink from '../navigate-to-link';
import { SidebarInspectorFill } from '../sidebar';

export const IFrame = ( {
	children,
	head,
	styles,
	bodyClassName,
	...props
} ) => {
	const [ contentRef, setContentRef ] = useState();
	const doc = contentRef && contentRef.contentWindow.document;

	useEffect( () => {
		if ( doc ) {
			doc.body.className = bodyClassName;
			doc.body.style.margin = '0';
			doc.head.innerHTML = head;
			doc.dir = document.dir;

			styles.forEach( ( { css } ) => {
				const styleEl = doc.createElement( 'style' );
				styleEl.innerHTML = css;
				doc.head.appendChild( styleEl );
			} );

			// Search the document for stylesheets targetting the editor canvas.
			Array.from( document.styleSheets ).reduce( ( acc, styleSheet ) => {
				// May fail for external styles.
				try {
					const isMatch = [ ...styleSheet.cssRules ].find(
						( { selectorText } ) => {
							return selectorText.includes(
								'.editor-styles-wrapper'
							);
						}
					);

					if ( isMatch ) {
						const node = styleSheet.ownerNode;

						if ( ! doc.getElementById( node.id ) ) {
							doc.head.appendChild( node );
						}
					}
				} catch ( e ) {}

				return acc;
			}, [] );
		}
	}, [ doc ] );

	return (
		<iframe
			{ ...props }
			ref={ setContentRef }
			title={ __( 'Editor canvas' ) }
			name="editor-canvas"
			data-loaded={ !! contentRef }
		>
			{ doc && createPortal( children, doc.body ) }
		</iframe>
	);
};

export default function BlockEditor( { setIsInserterOpen } ) {
	const { settings, templateType, page, deviceType } = useSelect(
		( select ) => {
			const {
				getSettings,
				getTemplateType,
				getPage,
				__experimentalGetPreviewDeviceType,
			} = select( 'core/edit-site' );
			return {
				settings: getSettings( setIsInserterOpen ),
				templateType: getTemplateType(),
				page: getPage(),
				deviceType: __experimentalGetPreviewDeviceType(),
			};
		},
		[ setIsInserterOpen ]
	);
	const [ blocks, onInput, onChange ] = useEntityBlockEditor(
		'postType',
		templateType
	);

	const { setPage } = useDispatch( 'core/edit-site' );

	const inlineStyles = useResizeCanvas( deviceType );

	return (
		<BlockEditorProvider
			settings={ settings }
			value={ blocks }
			onInput={ onInput }
			onChange={ onChange }
			useSubRegistry={ false }
		>
			<BlockEditorKeyboardShortcuts />
			<__experimentalLinkControl.ViewerFill>
				{ useCallback(
					( fillProps ) => (
						<NavigateToLink
							{ ...fillProps }
							activePage={ page }
							onActivePageChange={ setPage }
						/>
					),
					[ page ]
				) }
			</__experimentalLinkControl.ViewerFill>
			<SidebarInspectorFill>
				<BlockInspector />
			</SidebarInspectorFill>
			<IFrame
				className="edit-site-visual-editor"
				style={ inlineStyles }
				head={ window.__editorStyles.html }
				styles={ settings.styles }
				bodyClassName="editor-styles-wrapper edit-site-block-editor__editor-styles-wrapper"
			>
				<BlockSelectionClearer>
					<WritingFlow>
						<ObserveTyping>
							<BlockList className="edit-site-block-editor__block-list" />
						</ObserveTyping>
					</WritingFlow>
				</BlockSelectionClearer>
			</IFrame>
		</BlockEditorProvider>
	);
}
