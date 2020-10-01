/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { AsyncModeProvider, useSelect } from '@wordpress/data';
import { useRef, forwardRef } from '@wordpress/element';

/**
 * Internal dependencies
 */
import BlockListBlock from './block';
import BlockListAppender from '../block-list-appender';
import RootContainer from './root-container';
import useBlockDropZone from '../use-block-drop-zone';

/**
 * If the block count exceeds the threshold, we disable the reordering animation
 * to avoid laginess.
 */
const BLOCK_ANIMATION_THRESHOLD = 200;
// List of blocks to 'spotlight' when active in Full Site Editing.
const ENTITY_AREAS = [ 'core/template-part' ];

function BlockList(
	{
		className,
		rootClientId,
		renderAppender,
		__experimentalTagName = 'div',
		__experimentalAppenderTagName,
		__experimentalPassedProps = {},
	},
	ref
) {
	function selector( select ) {
		const {
			getBlockOrder,
			getBlockListSettings,
			getSettings,
			getSelectedBlockClientId,
			getMultiSelectedBlockClientIds,
			hasMultiSelection,
			getGlobalBlockCount,
			isTyping,
			isDraggingBlocks,
			getActiveBlockIdByBlockNames,
		} = select( 'core/block-editor' );

		// Determine if there is an active template part (or other entity) to spotlight.
		// Restrict to Full Site Editing experiment while the currently defined ENTITY_AREAS
		// only exist in FSE.
		const isFullSiteEditingEnabled = getSettings()
			.__experimentalEnableFullSiteEditing;
		const activeEntityBlockId =
			isFullSiteEditingEnabled &&
			getActiveBlockIdByBlockNames( ENTITY_AREAS );

		return {
			blockClientIds: getBlockOrder( rootClientId ),
			selectedBlockClientId: getSelectedBlockClientId(),
			multiSelectedBlockClientIds: getMultiSelectedBlockClientIds(),
			orientation: getBlockListSettings( rootClientId )?.orientation,
			hasMultiSelection: hasMultiSelection(),
			enableAnimation:
				! isTyping() &&
				getGlobalBlockCount() <= BLOCK_ANIMATION_THRESHOLD,
			isDraggingBlocks: isDraggingBlocks(),
			activeEntityBlockId,
		};
	}

	const {
		blockClientIds,
		selectedBlockClientId,
		multiSelectedBlockClientIds,
		orientation,
		hasMultiSelection,
		enableAnimation,
		isDraggingBlocks,
		activeEntityBlockId,
	} = useSelect( selector, [ rootClientId ] );

	const Container = rootClientId ? __experimentalTagName : RootContainer;
	const dropTargetIndex = useBlockDropZone( {
		element: ref,
		rootClientId,
	} );

	const isAppenderDropTarget =
		dropTargetIndex === blockClientIds.length && isDraggingBlocks;

	return (
		<Container
			ref={ ref }
			{ ...__experimentalPassedProps }
			className={ classnames(
				'block-editor-block-list__layout',
				className,
				__experimentalPassedProps.className
			) }
		>
			{ blockClientIds.map( ( clientId, index ) => {
				const isBlockInSelection = hasMultiSelection
					? multiSelectedBlockClientIds.includes( clientId )
					: selectedBlockClientId === clientId;

				const isDropTarget =
					dropTargetIndex === index && isDraggingBlocks;

				return (
					<AsyncModeProvider
						key={ clientId }
						value={ ! isBlockInSelection }
					>
						<BlockListBlock
							rootClientId={ rootClientId }
							clientId={ clientId }
							// This prop is explicitely computed and passed down
							// to avoid being impacted by the async mode
							// otherwise there might be a small delay to trigger the animation.
							index={ index }
							enableAnimation={ enableAnimation }
							className={ classnames( {
								'is-drop-target': isDropTarget,
								'is-dropping-horizontally':
									isDropTarget &&
									orientation === 'horizontal',
								'has-active-entity': activeEntityBlockId,
							} ) }
							activeEntityBlockId={ activeEntityBlockId }
						/>
					</AsyncModeProvider>
				);
			} ) }
			<BlockListAppender
				tagName={ __experimentalAppenderTagName }
				rootClientId={ rootClientId }
				renderAppender={ renderAppender }
				className={ classnames( {
					'is-drop-target': isAppenderDropTarget,
					'is-dropping-horizontally':
						isAppenderDropTarget && orientation === 'horizontal',
				} ) }
			/>
		</Container>
	);
}

const ForwardedBlockList = forwardRef( BlockList );

// This component needs to always be synchronous
// as it's the one changing the async mode
// depending on the block selection.
export default forwardRef( ( props, ref ) => {
	const fallbackRef = useRef();
	return (
		<AsyncModeProvider value={ false }>
			<ForwardedBlockList ref={ ref || fallbackRef } { ...props } />
		</AsyncModeProvider>
	);
} );
