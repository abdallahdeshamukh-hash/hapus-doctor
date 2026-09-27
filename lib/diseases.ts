// ------------------------------------------------------------------
// Hapus Doctor — static encyclopedia of the most common Alphonso
// (हपुस/आंबा) diseases and pests in the Konkan region. Powers the
// "मार्गदर्शन" guide tab. Marathi-first, English names in parentheses.
// Sources: Dr. Balasaheb Sawant Konkan Krishi Vidyapeeth (DBSKKV)
// extension recommendations, common agricultural extension material.
// This is guidance, not a prescription — always follow the label.
// ------------------------------------------------------------------

export type DiseaseInfo = {
  id: string;
  name_mr: string;
  name_en: string;
  symptom_mr: string;
  cause_mr: string;
  season_mr: string;
  treatment_mr: string;
  prevention_mr: string;
  color: string;
};

export const DISEASES: DiseaseInfo[] = [
  {
    id: 'bhuri',
    name_mr: 'भुरी (भुकटी)',
    name_en: 'Powdery Mildew',
    symptom_mr:
      'पानांवर, फुलांवर व फळांवर पांढरी शेंदूरसारखी भुरी. फुले व छोटी फळे गळतात. रोगट फळांवर डाग पडतात व ती खराब होतात.',
    cause_mr: 'बुरशी (Oidium mangiferae) — हवेतून पसरते, ढगळ व पर्स्यवस्थेत जास्त.',
    season_mr: 'फुलोरा व फळधारणा काळ (जानेवारी–मार्च)',
    treatment_mr:
      'सल्फर पावडर (२–३ कि.ग्रॅ./पंप) किंवा कोराझॉल/थियोव्हिट २ मि.लि./लिटर १०–१२ दिवसांच्या अंतराने २–३ फवारण्या.',
    prevention_mr:
      'फुलोऱ्याच्या सुरुवातीलाच पहिली फवारणी करा. बागेत हवेची संचारण क्षमता ठेवा — जादा फांद्या काढा.',
    color: '#d97706',
  },
  {
    id: 'kajli',
    name_mr: 'काजळी (अळी)',
    name_en: 'Mango Hopper / Inflorescence pest complex',
    symptom_mr:
      'फुलांवर व कोवळ्या पानांवर पिवळसर-तपकिरी किडींचे थवे. फुलांवर चिकट द्रव व त्यावर काळी बुरशी. फुले विळखतात व गळतात.',
    cause_mr: 'फुलकिडे (Idioscopus spp.) — फुलोऱ्यात सर्वांत धोकादायक कीड.',
    season_mr: 'फुलोरा (जानेवारी–फेब्रुवारी)',
    treatment_mr:
      'फुलोऱ्याच्या सुरुवातीला इमिडाक्लोप्रिड ०.३ मि.लि./लिटर किंवा थायामेथोक्झाम ०.२ ग्रॅ./लिटर; १०–१२ दिवसांनी पुन्हा एक फवारणी.',
    prevention_mr:
      'फुलोऱ्यापूर्वी बागेत खोल नांगरट करा व फांद्या छाटणी करा. चिकट पिवळे सापळे लावा.',
    color: '#dc2626',
  },
  {
    id: 'anthracnose',
    name_mr: 'काळा डाग (अँथ्रॅकनोज)',
    name_en: 'Anthracnose',
    symptom_mr:
      'पानांवर तपकिरी-काळे अनियमित डाग, नंतर पाने वाकडी होतात. फळांवर काळे बुडबुळे व डाग; पाऊस व दमट हवेत वेगाने पसरतो.',
    cause_mr: 'बुरशी (Colletotrichum gloeosporioides) — पावसाळ्यात व दमट हवेत.',
    season_mr: 'पावसाळा व पावसाळ्यानंतरची दमट हवा',
    treatment_mr:
      'कार्बेन्डाझिम १ ग्रॅ./लिटर किंवा कॉपर ऑक्सिक्लोराईड ३ ग्रॅ./लिटर १५ दिवसांच्या अंतराने २–३ फवारण्या.',
    prevention_mr:
      'छाटणीनंतर बागेत स्वच्छता ठेवा; गळालेली रोगट पाने-फळे जाळा. झाडांत हवा खेळती ठेवा.',
    color: '#7c3aed',
  },
  {
    id: 'phalmashi',
    name_mr: 'फळमाशी (ग्रॅप फ्रुट फ्लाय)',
    name_en: 'Fruit Fly',
    symptom_mr:
      'फळांवर लहान गोल छिद्रे, फळांत माशीची अळी (किडे), फळे पिकण्यापूर्वीच गळतात किंवा कुजतात.',
    cause_mr: 'फळमाशी (Bactrocera dorsalis) — फळ तोंड धरताच अंडी घालते.',
    season_mr: 'फळधारणा ते काढणी (मार्च–मे)',
    treatment_mr:
      'फेरोमोन (मिथाइल युजेनॉल) सापळे प्रति झाड ५–६ लावा. पॉवडर/ग्लू सापळे. गळालेली फळे रोज गोळा करून खोल गाडा.',
    prevention_mr:
      'काढणीनंतर बागेची स्वच्छता. शक्य असल्यास फळे पिशवीत (बॅगिंग) घाला.',
    color: '#ea580c',
  },
  {
    id: 'kahi-mala',
    name_mr: 'ठिपका मरण / काळी फांदी',
    name_en: 'Die-back / Twig blight',
    symptom_mr:
      'टोकाच्या फांद्या वरून कोरड्या होतात, पाने पिवळी पडतात; फांदीच्या छेदनबिंदूवर गम गळते.',
    cause_mr: 'बुरशी (Botryodiplodia theobromae) — छाटणीच्या जखमांतून शिरते.',
    season_mr: 'वर्षभर, पावसाळ्यात जास्त',
    treatment_mr:
      'रोगट फांद्या ५–१० से.मी. निरोगी भागासह काढून जाळा; छेदनबिंदूवर बोर्डो पेस्ट लावा. जीवामृत/बोर्डो फवारणी.',
    prevention_mr:
      'छाटणीची औजारे स्वच्ध करा; छाटणी निवडक हवामानात करा.',
    color: '#166534',
  },
  {
    id: 'sooty-mold',
    name_mr: 'काजळ (सूटी मोल्ड)',
    name_en: 'Sooty Mould',
    symptom_mr:
      'पानांवर व फांद्यांवर काळा चिकट थर — झाड "काळे" दिसते. सूर्यप्रकाश अडल्याने फोटोसिंथेसिस कमी होते.',
    cause_mr:
      'फुलकिड्यांच्या/मावांच्या चिकट स्रावावर बुरशी वाढते — मूळ कीड नियंत्रणात आणल्यावर आपोआप कमी होते.',
    season_mr: 'फुलोऱ्यानंतर',
    treatment_mr:
      'आधी फुलकिडे नियंत्रित करा (काजळी पहा). नंतर माकडलिंबाचे तेल ५ मि.लि./लिटर फवारणी — काळा थर निघून जातो.',
    prevention_mr: 'फुलकिडे नियंत्रण हीच खरी प्रतिबंधक उपाय.',
    color: '#334155',
  },
  {
    id: 'malformation',
    name_mr: 'फुलोऱ्याचे विकृतीकरण',
    name_en: 'Floral Malformation',
    symptom_mr:
      'फुलोरा जाड, ठुंगलदार व वाकडा; फुले निळसर, वाढलेले व फळ धरत नाहीत.',
    cause_mr: 'बुरशी + फुसेरियम मिश्र कारण; छाटणी न केलेल्या दाट झाडांत जास्त.',
    season_mr: 'फुलोरा',
    treatment_mr:
      'विकृत फुलोरा काढून नष्ट करा. ऑक्टोबरमध्ये पॅक्लोबुत्राझोल १ मि.लि./लिटर फवारणी (DBSKKV शिफारश) फुलोऱ्याची रचना सुधारते.',
    prevention_mr: 'वेळोवेळी छाटणी व खतव्यवस्था — झाड निरोगी ठेवा.',
    color: '#0e7490',
  },
  {
    id: 'gummosis',
    name_mr: 'खोडावर गम गळणे (गममोसिस)',
    name_en: 'Gummosis',
    symptom_mr:
      'खोडावर व फांद्यांवर पिवळसर-तपकिरी चिकट गम गळते; खोडाची साल फुटते, फांद्या वरून कोरड्या पडतात.',
    cause_mr: 'बुरशी (Phytophthora / Lasiodiplodia) — खराब निचरा व जास्त ओलावा.',
    season_mr: 'पावसाळा',
    treatment_mr:
      'रोगट साल घासून काढा, छेदनबिंदूवर बोर्डो पेस्ट किंवा कॉपर ऑक्सिक्लोराईड पेस्ट लावा; झाडामुळे रायडोमिल गोल्ड २ ग्रॅ./लिटर मुरमाड करा.',
    prevention_mr: 'बागेत पाणी साचू देऊ नका; खोडाजवळ जास्त पाणी देऊ नका.',
    color: '#92400e',
  },
  {
    id: 'healthy',
    name_mr: 'निरोगी झाड / सामान्य',
    name_en: 'Healthy',
    symptom_mr: 'चमकदार गडद हिरवी पाने, बारीक नसांचे जाळे व निरोगी फळवाढ.',
    cause_mr: '—',
    season_mr: '—',
    treatment_mr:
      'नियमित देखभाल: जून–जुलै व ऑक्टोबरमध्ये संतुलित खत (१५:१५:१५ + शेणखत), छाटणी, फुलोऱ्यापूर्वी तयारी.',
    prevention_mr:
      'प्रति झाड वयानुसार खत द्या; फुलोऱ्यापूर्वी कोरडा काळ ठेवा (मार्च महिन्यात पाणी नको — फुलोरा चांगला येतो).',
    color: '#16a34a',
  },
];

export function findDisease(id: string): DiseaseInfo | undefined {
  return DISEASES.find((d) => d.id === id);
}
