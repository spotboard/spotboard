require.config({
    baseUrl: "js",
    paths: {
        'jquery' : 'lib/jquery-1.8.2.min',
        'jquery.badger' : 'lib/jquery.badger.min',
        'jquery.slimscroll' : 'lib/jquery.slimscroll.min',
        'handlebars' : 'lib/handlebars'
    },
    shim: {
        'handlebars' : { exports : 'Handlebars' },
        'jquery.hotkeys' : { deps : ['jquery'] },
        'jquery.slimscroll' : { deps : ['jquery'], exports : 'jQuery.fn.slimScroll' },
        'jquery.badger' : { deps : ['jquery'], exports : 'jQuery.fn.badger' }
    }
});
