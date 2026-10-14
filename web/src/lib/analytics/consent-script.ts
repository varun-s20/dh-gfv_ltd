/**
 * Inline <head> bootstrap for Google Consent Mode v2.
 *
 * Mode "basic" (default): Google Tag Manager is not requested at all until the
 * visitor grants analytics or advertising consent. This is the conservative
 * reading of PECR / ICO guidance for the UK. Mode "advanced" loads GTM straight
 * away with everything denied so Google can send cookieless pings for modelling.
 *
 * The consent cookie `gf_consent` stores {a: analytics, m: marketing, v: version}.
 */
export type ConsentMode = "basic" | "advanced";

export const CONSENT_COOKIE = "gf_consent";
export const CONSENT_VERSION = 1;

export function consentBootstrapScript(gtmId: string | undefined, mode: ConsentMode = "basic") {
  const gtm = gtmId ? JSON.stringify(gtmId) : "null";
  return `(function(){
var w=window,d=document;w.dataLayer=w.dataLayer||[];
function gtag(){w.dataLayer.push(arguments);}w.gtag=gtag;
gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',functionality_storage:'granted',security_storage:'granted',wait_for_update:500});
gtag('set','ads_data_redaction',true);gtag('set','url_passthrough',true);
var id=${gtm},loaded=false;
w.__gfLoadTags=function(){if(loaded||!id)return;loaded=true;
w.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});
var s=d.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtm.js?id='+encodeURIComponent(id);d.head.appendChild(s);};
var c=null;try{var m=d.cookie.match(/(?:^|; )${CONSENT_COOKIE}=([^;]+)/);if(m){c=JSON.parse(decodeURIComponent(m[1]));}}catch(e){}
if(c&&c.v===${CONSENT_VERSION}){
gtag('consent','update',{analytics_storage:c.a?'granted':'denied',ad_storage:c.m?'granted':'denied',ad_user_data:c.m?'granted':'denied',ad_personalization:c.m?'granted':'denied'});
if(c.a||c.m){w.__gfLoadTags();}
}
${mode === "advanced" ? "w.__gfLoadTags();" : ""}
})();`;
}
