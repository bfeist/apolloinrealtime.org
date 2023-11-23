$(document).ready(function () {
  var webFontConfig = {
    google: {
      families: [
        "Michroma",
        "Oswald:300,400,700",
        "Roboto Mono:200,400,500,700",
        "Roboto Slab:300",
      ],
    },
    active: function () {
      console.log("INIT: fonts loaded");
    },
  };
  WebFont.load(webFontConfig);
  $("body").addClass("app-ready");
  console.log("ready!");
});

function missionClick(url) {
  window.location.href = url;
}
