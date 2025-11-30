<?php

add_action( 'wp_enqueue_scripts', 'liquid_child_theme_style', 99 );

function liquid_parent_theme_scripts() {
    wp_enqueue_style( 'parent-style', get_template_directory_uri() . '/style.css' );
}
function liquid_child_theme_style(){
    wp_enqueue_style( 'child-hub-style', get_stylesheet_directory_uri() . '/style.css' );	
}
function diwp_menu_shortcode($attr){
 
    $args = shortcode_atts(array(
 
                'name'  => '',
                'class' => ''
 
                ), $attr);
 
    return wp_nav_menu( array(
                'menu'             => $args['name'],
                'menu_class'    => $args['class']
            ));
}
add_shortcode('addmenu', 'diwp_menu_shortcode');

function enqueue_tinycolor_script() {
    wp_enqueue_script('tinycolor', 'https://cdn.jsdelivr.net/npm/tinycolor2@1.4.2/dist/tinycolor-min.js', array(), null, true);
}
add_action('wp_enqueue_scripts', 'enqueue_tinycolor_script');

