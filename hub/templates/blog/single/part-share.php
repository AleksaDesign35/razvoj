<?php

if ( class_exists( 'Liquid_Elementor_Addons' ) ){
	$page_settings_manager = \Elementor\Core\Settings\Manager::get_settings_managers( 'page' );
	$page_settings_model = $page_settings_manager->get_model( get_the_ID() );

	$sticky_share_view = $page_settings_model->get_settings( 'post_floating_box_social_style' );
	$sticky_share_view = $sticky_share_view ? $sticky_share_view : liquid_helper()->get_option( 'post-floating-box-social-style' );
	$author_in_sticky = $page_settings_model->get_settings( 'post_floating_box_author_enable' );
	$author_in_sticky = $author_in_sticky ? $author_in_sticky : liquid_helper()->get_option( 'post-floating-box-author-enable' );
} else {
	$sticky_share_view = liquid_helper()->get_option( 'post-floating-box-social-style' );
	$author_in_sticky = liquid_helper()->get_option( 'post-floating-box-author-enable' );
}

$social_icons_classname = 'social-icon social-icon-vertical ';

if ( $sticky_share_view === 'with-text-outline' ) {
	$social_icons_classname .= 'reset-ul social-icon-sm social-icon-underline social-icon-with-label';
} else {
	$social_icons_classname .= 'reset-ul social-icon-lg';
}

$pinterest_image = wp_get_attachment_url( get_post_thumbnail_id(), 'full' );

?>
<div class="lqd-post-sticky-stuff">
	<div class="lqd-post-sticky-stuff-inner">

		<?php if ( 'on' == $author_in_sticky ) : ?>
		<div class="entry-meta">
			<div class="byline">
				<figure>
					<?php echo get_avatar( get_the_author_meta( 'user_email' ), 80 ); ?>
				</figure>
				<span>
					<span><?php esc_html_e( 'Author', 'hub' ); ?></span>
					<?php liquid_author_link( array( 'before' => '', ) ); ?>
				</span>
			</div>
		</div>
		<?php endif; ?>

		<div class="lqd-post-share">
			<?php if ( $sticky_share_view === 'with-text-outline' ) :?>
			<span><?php esc_html_e( 'Share', 'hub' ); ?></span>
			<?php endif; ?>
			<ul class="<?php echo liquid_helper()->sanitize_html_classes( $social_icons_classname ); ?>">
				<li>
					<a rel="nofollow" target="_blank" href="https://www.facebook.com/sharer/sharer.php?u=<?php the_permalink(); ?>" aria-label="<?php echo esc_attr__( 'Facebook', 'hub' ) ?>">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 512" style="width: 1em; height: 1em;"><path fill="currentColor" d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z"/></svg>
						<?php if ( $sticky_share_view === 'with-text-outline' ) echo '<span style="margin-inline-start: 1em;">' . esc_html__( 'Facebook', 'hub' ) . '</span>' ?>
					</a>
				</li>
				<li>
					<a rel="nofollow" target="_blank" href="https://twitter.com/intent/tweet?text=<?php echo urlencode( get_the_title() ); ?>&amp;url=<?php the_permalink(); ?>" aria-label="<?php echo esc_attr__( 'Twitter', 'hub' ) ?>">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" style="width: 1em; height: 1em;" fill="currentColor"><path d="M8 2H1L9.26086 13.0145L1.44995 21.9999H4.09998L10.4883 14.651L16 22H23L14.3917 10.5223L21.8001 2H19.1501L13.1643 8.88578L8 2ZM17 20L5 4H7L19 20H17Z"></path></svg>
						<?php if ( $sticky_share_view === 'with-text-outline' ) echo '<span style="margin-inline-start: 1em;">' . esc_html__( 'Twitter', 'hub' ) . '</span>' ?>
					</a>
				</li>
				<li>
					<a rel="nofollow" target="_blank" href="https://pinterest.com/pin/create/button/?url=&amp;media=<?php echo esc_url( $pinterest_image ); ?>&amp;description=<?php echo urlencode( get_the_title() ); ?>" aria-label="<?php echo esc_attr__( 'Pinterest', 'hub' ) ?>">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512" style="width: 1em; height: 1em;"><path fill="currentColor" d="M204 6.5C101.4 6.5 0 74.9 0 185.6 0 256 39.6 296 63.6 296c9.9 0 15.6-27.6 15.6-35.4 0-9.3-23.7-29.1-23.7-67.8 0-80.4 61.2-137.4 140.4-137.4 68.1 0 118.5 38.7 118.5 109.8 0 53.1-21.3 152.7-90.3 152.7-24.9 0-46.2-18-46.2-43.8 0-37.8 26.4-74.4 26.4-113.4 0-66.2-93.9-54.2-93.9 25.8 0 16.8 2.1 35.4 9.6 50.7-13.8 59.4-42 147.9-42 209.1 0 18.9 2.7 37.5 4.5 56.4 3.4 3.8 1.7 3.4 6.9 1.5 50.4-69 48.6-82.5 71.4-172.8 12.3 23.4 44.1 36 69.3 36 106.2 0 153.9-103.5 153.9-196.8C384 71.3 298.2 6.5 204 6.5z"/></svg>
						<?php if ( $sticky_share_view === 'with-text-outline' ) echo '<span style="margin-inline-start: 1em;">' . esc_html__( 'Pinterest', 'hub' ) . '</span>' ?>
					</a>
				</li>
				<li>
					<a rel="nofollow" target="_blank" href="https://www.linkedin.com/shareArticle?mini=true&url=<?php the_permalink(); ?>&amp;title=<?php echo get_the_title(); ?>&amp;source=<?php echo get_bloginfo( 'name' ); ?>" aria-label="<?php echo esc_attr__( 'Linkedin', 'hub' ) ?>">
						<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512" style="width: 1em; height: 1em;"><path fill="currentColor" d="M100.28 448H7.4V148.9h92.88zM53.79 108.1C24.09 108.1 0 83.5 0 53.8a53.79 53.79 0 0 1 107.58 0c0 29.7-24.1 54.3-53.79 54.3zM447.9 448h-92.68V302.4c0-34.7-.7-79.2-48.29-79.2-48.29 0-55.69 37.7-55.69 76.7V448h-92.78V148.9h89.08v40.8h1.3c12.4-23.5 42.69-48.3 87.88-48.3 94 0 111.28 61.9 111.28 142.3V448z"/></svg>
						<?php if ( $sticky_share_view === 'with-text-outline' ) echo '<span style="margin-inline-start: 1em;">' . esc_html__( 'Linkedin', 'hub' ) . '</span>' ?>
					</a>
				</li>
			</ul>
		</div>
	</div>
</div>