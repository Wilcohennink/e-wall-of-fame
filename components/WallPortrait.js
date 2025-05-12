<div class="portrait-frame">
  <img src="/images/participant.jpg" alt="Deelnemer" class="portrait-img" />
  </div>
  // voorbeeld in WallPortraits.js
const { data: donations } = await supabase
  .from('donateurs')
- .select('*')
+ .select('*')
+ .eq('status', 'paid')    // haal alleen betaalde donaties op 