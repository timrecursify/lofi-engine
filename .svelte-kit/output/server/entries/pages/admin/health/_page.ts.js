import{r as a}from"../../../../chunks/index.js";const o=async({parent:t})=>{const{user:r}=await t();if(!r||r.publicMetadata?.role!=="super-admin")throw a(302,"/");return{user:r}};export{o as load};
