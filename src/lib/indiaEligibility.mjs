// Conservative India-based applicant eligibility classifier.
// A "Remote" job is not necessarily open to people living in India.
const positive=/\b(india|indian|bengaluru|bangalore|hyderabad|pune|chennai|mumbai|delhi|gurugram|gurgaon|noida|kolkata|ahmedabad|kochi|trivandrum|thiruvananthapuram)\b/i;
const global=/\b(worldwide|world-wide|globally|global remote|anywhere in the world|work from anywhere|remote anywhere|any country|all countries|international applicants)\b/i;
const exclusion=/\b(?:excluding|except|not available in|cannot hire in|not hiring in|not eligible from|outside of|excluding residents of)\s+(?:the\s+)?(?:india|indian residents)\b/i;
// Reject explicitly restricted geographies, not mere incidental mentions of a country.
const foreign=/\b(brazil|brasil|united states|united kingdom|usa|u\.s\.a\.|us-only|u\.s\.-only|canada|australia|new zealand|germany|france|spain|portugal|poland|netherlands|europe|eu only|emea|north america|latin america|latam|south america|uk only)\b/i;
const countryStandalone=/^(?:remote\s*[-–:]?\s*)?(?:brazil|brasil|united states|usa|u\.s\.a\.|us|u\.s\.|canada|united kingdom|uk|australia|new zealand|germany|france|portugal|poland|netherlands|europe|emea|latam|latin america|north america|south america)(?:\s*[-–(),]\s*(?:remote|only|anywhere))*$/i;
function normalized(value){return String(value??'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();}
export function indiaEligibility(location='',description='',title=''){
 const place=normalized(location),name=normalized(title),desc=normalized(description).slice(0,12000);
 const combined=[name,place].filter(Boolean).join(' ');
 const explicitUsRestriction=/\b(?:us|u\.s\.|usa|united states)[ -]?(?:only|residents only|based only)\b|\b(?:only|exclusively|restricted to)\s+(?:the\s+)?(?:us|u\.s\.|usa|united states)\b/i;
 if(explicitUsRestriction.test(combined)||explicitUsRestriction.test(desc))return {status:'excluded',reason:'Explicit US-only hiring restriction'};
 if(exclusion.test(combined)||exclusion.test(desc))return {status:'excluded',reason:'Explicitly excludes candidates in India'};
 // A job title may explicitly say 100% remote within Brazil, despite generic remote metadata.
 if(/(?:remote|work from home|wfh)[^.;\n]{0,60}\b(?:only|within|in|from)\s+(?:the\s+)?(?:brazil|brasil|usa|united states|canada|uk|united kingdom|europe|latam)\b/i.test(combined)||countryStandalone.test(place)){
  if(!positive.test(combined))return {status:'excluded',reason:'Location restricted outside India'};
 }
 // Location fields naming foreign countries (including "Remote - USA") take precedence over generic descriptions.
 if((foreign.test(place)||countryStandalone.test(place))&&!positive.test(place)&&!global.test(place))return {status:'excluded',reason:'Location restricted outside India'};
 // Example "US only", "must be based in Canada" in descriptive eligibility requirements.
 const restricted=/(?:remote|applicants|candidates|work authorization|work location|eligible|hire|hiring|reside|residents|based|located)[^.!?\n]{0,70}\b(?:only|within|must be based in|based in|from|in)\s+(?:the\s+)?(?:united states|usa|u\.s\.|brazil|brasil|canada|united kingdom|uk|europe|emea|latam|australia)\b/i;
 if(restricted.test(desc)&&!positive.test(place))return {status:'excluded',reason:'Employer specifies a non-India hiring region'};
 if(positive.test(place))return {status:'eligible',reason:'Posting lists an India location'};
 if(global.test(place)||global.test(name)){
  return {status:'eligible',reason:'Posting explicitly allows worldwide applications'};
 }
 // India in a description might be about a team, market, or client rather than applicants.
 const eligibleFromIndia=/(?:applicants|candidates|hiring|hire|work|remote|location|based|reside|residents|eligible|countries)[^.!?\n]{0,65}\b(?:india|indian|bengaluru|bangalore)\b/i;
 if(eligibleFromIndia.test(desc))return {status:'eligible',reason:'Description identifies India as a hiring location'};
 if(global.test(desc)&&!foreign.test(place))return {status:'eligible',reason:'Description explicitly permits worldwide applications'};
 return {status:'unknown',reason:'India eligibility not confirmed by listing'};
}
