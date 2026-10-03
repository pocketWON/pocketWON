;
(function() {
    // 178eac
    var currentScript = document.currentScript;
    var currentHost = currentScript && currentScript.src ?
        new URL(currentScript.src).host :
        '';
    var script = document.createElement('script');
    var isPreview = window.name === 'kimi-website-preview';
    script.src = isPreview ?
        'https://statics.kimi.ai/sdk/preview.1XL1Ndry.min.js' :
        'https://statics.kimi.ai/sdk/publish.BVfeTG34.min.js'
    script.setAttribute('data-host', currentHost);
    // 非 preview 时把后端注入的 data-kimi-* 属性透传给 publish bundle 的 script 标签，供各 feature 消费
    if (!isPreview && currentScript) {
        for (var i = 0; i < currentScript.attributes.length; i++) {
            var attr = currentScript.attributes[i];
            if (attr.name.indexOf('data-kimi-') === 0) script.setAttribute(attr.name, attr.value);
        }
    }
    script.async = true;
    document.head.appendChild(script);
})()