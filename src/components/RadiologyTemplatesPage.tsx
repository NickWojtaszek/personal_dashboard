import { useState, useRef, useEffect, useMemo } from "react";

const TEMPLATES = [
  {
    id: "1.1.1",
    name: "CT Head (Normal Findings)",
    category: "Head and Brain",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "Non-contrast CT of the head. Axial acquisitions with coronal and sagittal reformats.", editable: true, isHeader: true, techniques: ["Non-contrast CT of the head. Axial acquisitions with coronal and sagittal reformats.", "Non-contrast CT of the head. Axial 5mm sections from skull base to vertex.", "Non-contrast CT of the head performed as per departmental stroke protocol.", "Non-contrast CT of the head. Axial acquisitions with multiplanar reformats. No intravenous contrast administered."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      {
        label: "BRAIN PARENCHYMA",
        concise: "No intracranial hemorrhage, acute infarction, or mass lesions. Normal gray-white matter differentiation. No brain edema or hydrocephalus.",
        semiconcise: "No intracranial hemorrhage, acute infarction, space-occupying lesions, brain edema, or hydrocephalus. No hyperdense vessel sign. Normal gray-white matter differentiation is maintained. Age-appropriate cortical sulci pattern. Normal white matter attenuation.",
        verbose: "There is no evidence of intracranial hemorrhage, acute infarction, space-occupying lesions, brain edema, or hydrocephalus. No hyperdense vessel sign is identified. Normal gray-white matter differentiation is maintained throughout both cerebral hemispheres. The cortical sulci demonstrate an age-appropriate pattern with no focal widening or effacement. The white matter shows normal attenuation without evidence of chronic small vessel disease or demyelinating lesions.",
      },
      {
        label: "EXTRA-AXIAL SPACES AND SKULL",
        concise: "No midline shift. Patent basal cisterns. Normal ventricular system. Intact calvarium.",
        semiconcise: "Patent and symmetrical basal cisterns with no mass effect. No midline shift. Normal ventricular system with no hydrocephalus. Normal brainstem and cerebellum. No posterior fossa abnormalities. Intact calvarium with no fractures. Well-pneumatized paranasal sinuses and mastoid air cells.",
        verbose: "The basal cisterns are patent and symmetrical with no evidence of mass effect or compression. No midline shift is present. The ventricular system is of normal size and configuration with no evidence of hydrocephalus or asymmetry. The brainstem appears normal in size and attenuation without focal lesions. The cerebellum demonstrates normal morphology with no evidence of tonsillar herniation or mass lesions. No posterior fossa abnormalities are identified. The visualized calvarium shows no fractures or lytic lesions. The paranasal sinuses and mastoid air cells appear well-pneumatized and clear.",
      },
      {
        label: "CONCLUSION",
        concise: "No acute intracranial pathology.",
        semiconcise: "No acute intracranial pathology. Normal brain parenchyma and extra-axial spaces.",
        verbose: "No evidence of acute intracranial pathology. Normal brain parenchyma and extra-axial spaces.",
        isConclusion: true,
      },
      {
        label: "RECOMMENDATIONS",
        concise: "No further neuroimaging required. Clinical correlation advised if symptoms persist.",
        semiconcise: "No further neuroimaging required based on these normal findings. Clinical correlation advised if neurological symptoms persist.",
        verbose: "No further neuroimaging is required based on these normal findings. Clinical correlation is advised if neurological symptoms persist despite normal imaging findings.",
        isConclusion: true,
      },
    ],
  },
  {
    id: "1.1.2",
    name: "CT Head (Age-Appropriate Changes)",
    category: "Head and Brain",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "Non-contrast CT of the head. Axial acquisitions with coronal and sagittal reformats.", editable: true, isHeader: true, techniques: ["Non-contrast CT of the head. Axial acquisitions with coronal and sagittal reformats.", "Non-contrast CT of the head. Axial 5mm sections from skull base to vertex.", "Non-contrast CT of the head. Axial acquisitions with multiplanar reformats. No intravenous contrast administered."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      {
        label: "BRAIN PARENCHYMA",
        concise: "No intracranial hemorrhage, acute infarction, or mass lesions. Age-appropriate cerebral atrophy with proportionate ventricular dilatation. Chronic small vessel ischemic changes in periventricular white matter.",
        semiconcise: "No intracranial hemorrhage, acute infarction, space-occupying lesions, brain edema, or hydrocephalus. No hyperdense vessel sign. Chronic small vessel ischemic changes with periventricular white matter hypodensities, most pronounced in the centrum semiovale bilaterally, consistent with age-appropriate microangiopathy. No acute white matter lesions.",
        verbose: "There is no evidence of intracranial hemorrhage, acute infarction, space-occupying lesions, brain edema, or hydrocephalus. No hyperdense vessel sign is identified. Chronic small vessel ischemic changes are present with periventricular white matter hypodensities, most pronounced in the centrum semiovale bilaterally. These changes are consistent with chronic microangiopathy and are age-appropriate. No acute white matter lesions or areas of restricted diffusion are apparent on this non-contrast study.",
      },
      {
        label: "EXTRA-AXIAL SPACES AND SKULL",
        concise: "Age-appropriate cortical sulci widening. No midline shift. Patent basal cisterns. Intact calvarium.",
        semiconcise: "Age-appropriate cerebral atrophy with proportionate widening of cortical sulci and sylvian fissures. Mild ex-vacuo ventricular dilatation consistent with age. No midline shift. Patent basal cisterns. Normal brainstem and cerebellum for age. Unremarkable calvarium, paranasal sinuses, and mastoid air cells.",
        verbose: "Age-appropriate cerebral atrophy is present with proportionate widening of the cortical sulci and sylvian fissures. There is mild ex-vacuo dilatation of the ventricular system, which is consistent with the patient's age and degree of cerebral volume loss. No midline shift is present. The basal cisterns are prominent but patent without evidence of mass effect. The brainstem and cerebellum appear normal for age with no focal abnormalities. No posterior fossa lesions are identified. The visualized calvarium, paranasal sinuses, and mastoid air cells are unremarkable.",
      },
      {
        label: "CONCLUSION",
        concise: "Age-appropriate cerebral atrophy and chronic small vessel ischemic changes. No acute intracranial pathology.",
        semiconcise: "Age-appropriate cerebral atrophy and chronic small vessel ischemic changes. No acute intracranial pathology identified.",
        verbose: "Age-appropriate cerebral atrophy and chronic small vessel ischemic changes. No acute intracranial pathology identified.",
        isConclusion: true,
      },
      {
        label: "RECOMMENDATIONS",
        concise: "No further neuroimaging required. Clinical correlation with vascular risk factors advised.",
        semiconcise: "No further neuroimaging required. Clinical correlation with vascular risk factors advised. Consider optimization of cardiovascular risk factors to minimize small vessel disease progression.",
        verbose: "No further neuroimaging is required based on these findings. Clinical correlation with vascular risk factors is advised. Consider optimization of cardiovascular risk factors including blood pressure control, diabetes management, and lipid control to minimize progression of small vessel disease.",
        isConclusion: true,
      },
    ],
  },
  {
    id: "1.2.1",
    name: "CT Cerebral Angiogram",
    category: "Head and Brain",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "Head, angiographic phase", editable: true, isHeader: true, techniques: ["CT angiography of the head performed with intravenous contrast administration. Axial acquisitions with coronal and sagittal reformats, MIP and 3D volume-rendered reconstructions.", "CT angiography of the head. Bolus-tracked contrast injection with arterial phase acquisition. Multiplanar and 3D reformats generated.", "CT cerebral angiography with IV contrast. Thin-section axial acquisitions with MIP, MPR, and VRT post-processing."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      {
        label: "INTRACRANIAL ARTERIES",
        concise: "Circle of Willis demonstrates normal anatomy. Bilateral carotid, anterior, middle and posterior cerebral arteries show normal caliber without stenosis or aneurysm. Vertebrobasilar system patent.",
        semiconcise: "Normal Circle of Willis anatomy with patent communicating arteries. Bilateral internal carotid arteries show normal caliber without stenosis, aneurysm, or dissection. Patent anterior cerebral (A1, A2), middle cerebral (M1, M2), and posterior cerebral arteries with normal caliber. Vertebral and basilar arteries patent with normal caliber. Cerebellar arteries patent.",
        verbose: "The Circle of Willis demonstrates normal anatomy with patent anterior and posterior communicating arteries allowing for adequate cross-flow between hemispheres. The bilateral internal carotid arteries show normal caliber and course through the cavernous sinuses and into the skull base without evidence of stenosis, aneurysm, or dissection. The anterior cerebral arteries (A1 and A2 segments) are patent bilaterally with normal caliber and no evidence of spasm or occlusion. The middle cerebral arteries (M1 and M2 segments) demonstrate normal branching patterns and caliber without stenosis or aneurysm formation. The posterior cerebral arteries are patent with normal P1 and P2 segments. The vertebral arteries show normal caliber and course with patent origins from the subclavian arteries. The basilar artery is of normal caliber without evidence of stenosis or aneurysm. All visualized cerebellar arteries, including the posterior inferior cerebellar, anterior inferior cerebellar, and superior cerebellar arteries, are patent with normal enhancement.",
      },
      {
        label: "VENOUS STRUCTURES",
        concise: "Patent venous sinuses with normal flow. No evidence of thrombosis.",
        semiconcise: "Patent venous sinuses with normal flow and no thrombosis or stenosis. Normal caliber superior sagittal, transverse, and sigmoid sinuses. Normal internal jugular vein flow.",
        verbose: "The venous sinuses are patent with normal flow patterns and no evidence of thrombosis or stenosis. The superior sagittal sinus, transverse sinuses, and sigmoid sinuses show normal caliber and enhancement. The internal jugular veins demonstrate normal flow without obstruction.",
      },
      {
        label: "CONCLUSION",
        concise: "No significant vascular abnormality. No large vessel occlusion or arterial compromise.",
        semiconcise: "No significant vascular abnormality. No large vessel occlusion, arterial compromise, or dissection. Normal cerebral angiographic appearance.",
        verbose: "No significant vascular abnormality visible in the current study. No evidence of a large vessel occlusion, arterial compromise, or dissection within the intracranial segments of the carotid, cerebral, and vertebral arteries. Normal cerebral angiographic appearance.",
        isConclusion: true,
      },
      {
        label: "RECOMMENDATIONS",
        concise: "No further vascular imaging indicated. Clinical correlation advised if symptoms persist.",
        semiconcise: "No further vascular imaging indicated based on these normal findings. Clinical correlation advised if symptoms persist, as small vessel disease may not be apparent on CTA.",
        verbose: "No further vascular imaging is indicated based on these normal findings. Clinical correlation is advised if symptoms persist, as small vessel disease or functional abnormalities may not be apparent on CTA imaging.",
        isConclusion: true,
      },
    ],
  },
  {
    id: "1.2.2",
    name: "CT Cerebral Venogram",
    category: "Head and Brain",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "Head, venographic phase", editable: true, isHeader: true, techniques: ["CT venography of the head performed with intravenous contrast administration in venous phase. Axial acquisitions with coronal and sagittal reformats, MIP reconstructions.", "CT cerebral venography with IV contrast. Delayed venous phase acquisition with multiplanar and MIP reformats.", "CT venography of the head. Contrast-enhanced venous phase imaging with thin-section axial acquisitions and multiplanar reconstructions."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      {
        label: "DURAL VENOUS SINUSES",
        concise: "Patent superior sagittal, transverse, and sigmoid sinuses bilaterally. No filling defects or thrombosis.",
        semiconcise: "Patent superior sagittal sinus with normal caliber and smooth margins. Bilateral transverse sinuses patent with normal enhancement, accounting for normal anatomical asymmetry. Patent sigmoid sinuses bilaterally. No filling defects or evidence of thrombosis. Normal torcula herophili.",
        verbose: "The superior sagittal sinus is patent throughout its course with normal caliber and smooth margins without evidence of filling defects or thrombosis. The bilateral transverse sinuses are patent with normal enhancement, demonstrating the expected mild right-dominant asymmetry. The sigmoid sinuses are patent bilaterally with normal enhancement and caliber. No filling defects or evidence of venous sinus thrombosis are identified. The torcula herophili (confluence of sinuses) demonstrates normal opacification and flow.",
      },
      {
        label: "DEEP VEINS AND CORTICAL VEINS",
        concise: "Patent deep venous system including internal cerebral veins and vein of Galen. Normal cortical venous drainage.",
        semiconcise: "Patent internal cerebral veins and vein of Galen. Normal deep venous system with patent basal veins of Rosenthal. Normal straight sinus. Cortical veins show normal drainage patterns. No cortical vein thrombosis.",
        verbose: "The deep venous system is patent including the internal cerebral veins, basal veins of Rosenthal, and the vein of Galen. The straight sinus demonstrates normal opacification. No evidence of deep venous thrombosis is identified. The cortical veins show normal drainage patterns with no evidence of cortical vein thrombosis or abnormal venous collaterals.",
      },
      {
        label: "CONCLUSION",
        concise: "No evidence of cerebral venous sinus thrombosis. Normal venographic appearance.",
        semiconcise: "No evidence of cerebral venous sinus thrombosis. Patent dural venous sinuses and deep venous system. Normal venographic appearance.",
        verbose: "No evidence of cerebral venous sinus thrombosis. Patent dural venous sinuses and deep venous system. Normal venographic appearance.",
        isConclusion: true,
      },
      {
        label: "RECOMMENDATIONS",
        concise: "No further venous imaging indicated. Clinical correlation advised if symptoms persist.",
        semiconcise: "No further venous imaging indicated based on these normal findings. Clinical correlation advised if symptoms of raised intracranial pressure persist.",
        verbose: "No further venous imaging is indicated based on these normal findings. Clinical correlation is advised if symptoms of raised intracranial pressure persist despite normal venographic findings.",
        isConclusion: true,
      },
    ],
  },
  {
    id: "2.1.1",
    name: "CT Cervical Spine",
    category: "Spine",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "Non-contrast CT of the cervical spine. Axial acquisitions with sagittal and coronal reformats in bone and soft tissue algorithms.", editable: true, isHeader: true, techniques: ["Non-contrast CT of the cervical spine. Axial acquisitions with sagittal and coronal reformats in bone and soft tissue algorithms.", "CT cervical spine per trauma protocol. Helical acquisition with multiplanar reformats in bone and soft tissue windows.", "Non-contrast CT cervical spine. Thin-section axial acquisitions with sagittal and coronal reformats."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      {
        label: "ALIGNMENT AND VERTEBRAL BODIES",
        concise: "Normal cervical lordosis. Normal vertebral body heights. No fractures.",
        semiconcise: "Normal cervical lordosis maintained. Vertebral body heights and alignment are normal from C1 to C7. No fractures or subluxations. Normal atlantoaxial relationship with intact dens. Prevertebral soft tissues are within normal limits.",
        verbose: "Normal cervical lordosis is maintained. The vertebral body heights and alignment are normal throughout the cervical spine from C1 to C7. No fractures, compression deformities, or subluxations are identified. The atlantoaxial relationship is normal with an intact dens and normal atlantodental interval. The prevertebral soft tissues are within normal limits with no swelling to suggest occult injury.",
      },
      {
        label: "DISC SPACES AND NEURAL FORAMINA",
        concise: "Normal disc space heights. No significant canal or foraminal stenosis.",
        semiconcise: "Normal disc space heights maintained at all levels. No significant disc protrusions or herniations. Patent spinal canal with normal cord space. Normal neural foramina bilaterally at all levels. Normal uncovertebral and facet joints.",
        verbose: "The disc space heights are maintained at all levels from C2-3 to C7-T1. No significant disc protrusions, herniations, or osteophyte complexes are identified. The spinal canal is patent with normal AP diameter and adequate cord space. The neural foramina are patent bilaterally at all levels with no evidence of foraminal stenosis. The uncovertebral joints and facet joints appear normal without significant degenerative changes.",
      },
      {
        label: "CONCLUSION",
        concise: "Normal cervical spine. No acute osseous injury.",
        semiconcise: "Normal cervical spine. No acute fracture, subluxation, or significant degenerative change.",
        verbose: "Normal cervical spine. No acute fracture, subluxation, or significant degenerative change. Normal prevertebral soft tissues.",
        isConclusion: true,
      },
      {
        label: "RECOMMENDATIONS",
        concise: "No further spinal imaging required. Clinical correlation advised.",
        semiconcise: "No further spinal imaging required based on these normal findings. Clinical and neurological correlation advised if symptoms persist.",
        verbose: "No further spinal imaging is required based on these normal findings. Clinical and neurological correlation is advised if symptoms persist. Consider MRI if there is concern for ligamentous injury or soft tissue pathology not apparent on CT.",
        isConclusion: true,
      },
    ],
  },
  {
    id: "2.1.2",
    name: "CT Lumbar Spine",
    category: "Spine",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "Non-contrast CT of the lumbar spine. Axial acquisitions with sagittal and coronal reformats in bone and soft tissue algorithms.", editable: true, isHeader: true, techniques: ["Non-contrast CT of the lumbar spine. Axial acquisitions with sagittal and coronal reformats in bone and soft tissue algorithms.", "CT lumbar spine without contrast. Helical acquisition with multiplanar reformats.", "Non-contrast CT lumbar spine. Thin-section axial acquisitions through disc levels with sagittal and coronal reformats."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      {
        label: "ALIGNMENT AND VERTEBRAL BODIES",
        concise: "Normal lumbar lordosis. Normal vertebral body heights. No fractures or listhesis.",
        semiconcise: "Normal lumbar lordosis maintained. Vertebral body heights are normal from L1 to L5 with no fractures, compression deformities, or listhesis. Normal pars interarticularis bilaterally. Normal sacrum and coccyx.",
        verbose: "Normal lumbar lordosis is maintained. The vertebral body heights and alignment are normal throughout the lumbar spine from L1 to L5. No fractures, compression deformities, or spondylolisthesis are identified. The pars interarticularis is intact bilaterally at all levels. The sacrum and coccyx appear normal without fracture or developmental anomaly.",
      },
      {
        label: "DISC SPACES AND NEURAL FORAMINA",
        concise: "Normal disc space heights. No significant canal or foraminal stenosis. Normal conus position.",
        semiconcise: "Normal disc space heights at all levels. No significant disc protrusions or herniations. Patent spinal canal and neural foramina at all levels. Normal facet joints. Conus medullaris terminates at normal level.",
        verbose: "The disc space heights are maintained at all levels from L1-2 to L5-S1. No significant disc protrusions, herniations, or sequestrations are identified. The spinal canal is patent with normal AP diameter at all levels. The neural foramina are patent bilaterally with no foraminal stenosis. The facet joints show normal alignment without significant hypertrophic changes. The conus medullaris terminates at the normal L1-2 level.",
      },
      {
        label: "CONCLUSION",
        concise: "Normal lumbar spine. No acute osseous injury or significant degenerative disease.",
        semiconcise: "Normal lumbar spine. No acute fracture, significant degenerative changes, or spinal canal stenosis.",
        verbose: "Normal lumbar spine. No acute fracture, significant degenerative changes, or spinal canal stenosis.",
        isConclusion: true,
      },
      {
        label: "RECOMMENDATIONS",
        concise: "No further spinal imaging required. Clinical correlation advised.",
        semiconcise: "No further spinal imaging required based on these findings. Clinical correlation advised if symptoms persist. Consider MRI if radiculopathy or soft tissue pathology is suspected.",
        verbose: "No further spinal imaging is required based on these normal findings. Clinical correlation is advised if symptoms persist. MRI of the lumbar spine is recommended if there is clinical suspicion of disc herniation, radiculopathy, or soft tissue pathology not adequately assessed on CT.",
        isConclusion: true,
      },
    ],
  },
  {
    id: "3.1.1",
    name: "CT Chest",
    category: "Chest",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "Non-contrast CT of the chest. Axial acquisitions with coronal and sagittal reformats.", editable: true, isHeader: true, techniques: ["Non-contrast CT of the chest. Axial acquisitions with coronal and sagittal reformats.", "CT chest without contrast per departmental protocol. Axial acquisitions with multiplanar reformats.", "CT thorax with intravenous contrast. Axial acquisitions with coronal and sagittal reformats in lung and mediastinal windows."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      {
        label: "LUNGS AND AIRWAYS",
        concise: "Clear lungs bilaterally. No masses, consolidation, or pleural effusions. Normal airways to subsegmental level.",
        semiconcise: "Clear lungs bilaterally with no masses, consolidation, ground-glass opacities, or pleural effusions. Normal airway caliber from trachea to subsegmental bronchi. No bronchial wall thickening. No pneumothorax.",
        verbose: "The lungs are clear bilaterally with no focal consolidation, ground-glass opacification, masses, or nodules. There are no pleural effusions. The trachea and major bronchi are patent with normal caliber and no endobronchial lesions. The airways appear normal to the subsegmental level. No bronchial wall thickening or mucus plugging is identified. No pneumothorax is present.",
      },
      {
        label: "MEDIASTINUM AND HEART",
        concise: "Normal heart size. Normal mediastinal structures. No lymphadenopathy.",
        semiconcise: "Normal heart size and pericardium. Normal aorta, pulmonary arteries, and great vessels. No mediastinal or hilar lymphadenopathy. Normal esophagus.",
        verbose: "The heart is normal in size and configuration with no pericardial effusion. The thoracic aorta, pulmonary arteries, and great vessels are of normal caliber without aneurysmal dilatation or dissection. No mediastinal or hilar lymphadenopathy is identified by size criteria. The esophagus appears normal in course and caliber.",
      },
      {
        label: "CHEST WALL AND BONES",
        concise: "Normal chest wall. Intact ribs and visualized spine. Normal soft tissues.",
        semiconcise: "Normal chest wall musculature and subcutaneous tissues. Intact ribs with no fractures. Normal visualized thoracic spine. No soft tissue masses or collections.",
        verbose: "The chest wall musculature and subcutaneous tissues appear normal. The ribs are intact bilaterally with no fractures identified. The visualized thoracic spine shows normal alignment and vertebral body heights. No soft tissue masses, collections, or axillary lymphadenopathy are identified.",
      },
      {
        label: "CONCLUSION",
        concise: "Normal chest examination. No acute cardiopulmonary abnormality.",
        semiconcise: "Normal chest CT. No acute cardiopulmonary abnormality or significant pathology identified.",
        verbose: "Normal chest CT examination. No acute cardiopulmonary abnormality or significant pathology identified.",
        isConclusion: true,
      },
      {
        label: "RECOMMENDATIONS",
        concise: "No further thoracic imaging required. Clinical correlation advised if symptoms persist.",
        semiconcise: "No further thoracic imaging required based on these normal findings. Clinical correlation advised if respiratory symptoms persist.",
        verbose: "No further thoracic imaging is required based on these normal findings. Clinical correlation is advised if respiratory symptoms persist despite normal imaging findings.",
        isConclusion: true,
      },
    ],
  },
  {
    id: "3.1.2",
    name: "CT Pulmonary Angiogram",
    category: "Chest",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "CT pulmonary angiography with intravenous contrast. Bolus-tracked acquisition with axial images and coronal/sagittal reformats.", editable: true, isHeader: true, techniques: ["CT pulmonary angiography with intravenous contrast. Bolus-tracked acquisition with axial images and coronal/sagittal reformats.", "CTPA per departmental PE protocol. Bolus-tracked arterial phase with multiplanar reformats.", "CT pulmonary angiography with IV contrast. Triggered acquisition from pulmonary trunk with thin-section axial and multiplanar reconstructions."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      {
        label: "PULMONARY ARTERIES",
        concise: "No pulmonary embolism. Patent main, lobar, segmental and subsegmental pulmonary arteries bilaterally.",
        semiconcise: "No pulmonary embolism identified. Adequate contrast opacification of the pulmonary arterial tree to subsegmental level. Patent main, lobar, segmental, and subsegmental pulmonary arteries bilaterally. Normal main pulmonary artery caliber (2.5cm). No right heart strain.",
        verbose: "No pulmonary embolism is identified. There is adequate contrast opacification of the pulmonary arterial tree to the subsegmental level bilaterally, providing diagnostic quality for the exclusion of pulmonary embolism. The main, lobar, segmental, and subsegmental pulmonary arteries are patent bilaterally with no filling defects. The main pulmonary artery measures 2.5cm in diameter, which is within normal limits. No features of right heart strain are present including no rightward bowing of the interventricular septum and normal RV to LV ratio.",
      },
      {
        label: "LUNGS AND MEDIASTINUM",
        concise: "Clear lungs. No pleural effusion or pneumothorax. Normal heart size. No pericardial effusion.",
        semiconcise: "Clear lungs with no consolidation, ground-glass opacity, or pleural effusions. No pneumothorax. Normal heart size with no pericardial effusion. Normal mediastinal structures. No lymphadenopathy.",
        verbose: "The lungs are clear bilaterally with no consolidation, ground-glass opacity, or pleural effusions. No pneumothorax is present. The heart is normal in size with no pericardial effusion. The mediastinal structures appear normal with no lymphadenopathy identified.",
      },
      {
        label: "CONCLUSION",
        concise: "No pulmonary embolism. Normal chest CT.",
        semiconcise: "No pulmonary embolism. Normal CTPA examination with no acute cardiopulmonary abnormality.",
        verbose: "No pulmonary embolism identified on this diagnostic quality CTPA. No acute cardiopulmonary abnormality.",
        isConclusion: true,
      },
      {
        label: "RECOMMENDATIONS",
        concise: "No further pulmonary vascular imaging required. Clinical correlation advised.",
        semiconcise: "No further pulmonary vascular imaging required based on these normal findings. Consider alternative diagnoses for presenting symptoms. Clinical correlation advised.",
        verbose: "No further pulmonary vascular imaging is required based on these normal findings. Consider alternative diagnoses for the presenting symptoms. Clinical correlation is advised.",
        isConclusion: true,
      },
    ],
  },
  {
    id: "3.1.3",
    name: "High-Resolution CT Chest",
    category: "Chest",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "High-resolution CT of the chest without contrast. Inspiratory and expiratory thin-section axial acquisitions with coronal and sagittal reformats.", editable: true, isHeader: true, techniques: ["High-resolution CT of the chest without contrast. Inspiratory and expiratory thin-section axial acquisitions with coronal and sagittal reformats.", "HRCT chest per interstitial lung disease protocol. Thin-section (1mm) axial images in inspiration and expiration with prone images.", "High-resolution CT chest. Non-contrast thin-section axial acquisitions with multiplanar reformats in lung windows."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      {
        label: "LUNG PARENCHYMA",
        concise: "Normal lung parenchyma bilaterally. No interstitial lung disease, ground-glass opacity, or nodules.",
        semiconcise: "Normal lung parenchyma bilaterally with no interstitial lung disease pattern. No ground-glass opacity, honeycombing, or traction bronchiectasis. No nodules or masses. Normal lung architecture maintained throughout.",
        verbose: "The lung parenchyma appears normal bilaterally with no evidence of interstitial lung disease. No ground-glass opacity, reticular pattern, honeycombing, or traction bronchiectasis is identified. No pulmonary nodules or masses are present. Normal lung architecture is maintained throughout both lungs with normal secondary pulmonary lobular structure.",
      },
      {
        label: "AIRWAYS AND PLEURA",
        concise: "Normal airways to subsegmental level. No air trapping on expiratory images. No pleural disease.",
        semiconcise: "Normal airway caliber and wall thickness from trachea to subsegmental bronchi. No air trapping on expiratory images. Normal pleural surfaces with no thickening, effusion, or calcification.",
        verbose: "The airways demonstrate normal caliber and wall thickness from the trachea to the subsegmental level. No bronchiectasis, bronchial wall thickening, or mucus plugging is identified. Expiratory images show no significant air trapping. The pleural surfaces are normal with no thickening, effusion, or calcification.",
      },
      {
        label: "CONCLUSION",
        concise: "Normal HRCT chest. No interstitial lung disease.",
        semiconcise: "Normal HRCT chest examination. No evidence of interstitial lung disease or significant pulmonary pathology.",
        verbose: "Normal HRCT chest examination. No evidence of interstitial lung disease or significant pulmonary pathology.",
        isConclusion: true,
      },
      {
        label: "RECOMMENDATIONS",
        concise: "No further imaging required. Clinical correlation advised if symptoms persist.",
        semiconcise: "No further imaging required based on these normal findings. Consider pulmonary function testing if clinical suspicion for lung disease persists.",
        verbose: "No further imaging is required based on these normal findings. Pulmonary function testing may be considered if clinical suspicion for lung disease persists despite normal imaging. Clinical correlation advised.",
        isConclusion: true,
      },
    ],
  },
  {
    id: "4.1.1",
    name: "CT Neck",
    category: "Neck",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "CT of the neck with intravenous contrast. Axial acquisitions with coronal and sagittal reformats.", editable: true, isHeader: true, techniques: ["CT of the neck with intravenous contrast. Axial acquisitions with coronal and sagittal reformats.", "CT neck without contrast per departmental protocol. Axial acquisitions with multiplanar reformats.", "CT neck with IV contrast. Axial acquisitions with coronal and sagittal reformats in soft tissue and bone windows."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      {
        label: "NECK SPACES AND VISCERA",
        concise: "Normal pharynx, larynx, and oral cavity. Normal salivary glands. Normal thyroid. No masses.",
        semiconcise: "Normal pharynx, larynx, and oral cavity with symmetric mucosal enhancement. Normal parotid and submandibular salivary glands. Normal thyroid gland in size and attenuation. No masses or collections in the visceral, carotid, or posterior cervical spaces.",
        verbose: "The pharynx, larynx, and oral cavity demonstrate normal mucosal enhancement and symmetric anatomy. The parotid and submandibular salivary glands are normal in size and attenuation bilaterally. The thyroid gland is normal in size and attenuation with no focal nodules or masses. No abnormal masses or fluid collections are identified in the visceral, carotid, or posterior cervical spaces.",
      },
      {
        label: "LYMPH NODES AND VESSELS",
        concise: "No pathological lymphadenopathy. Normal carotid and vertebral arteries. Patent jugular veins.",
        semiconcise: "No pathological cervical lymphadenopathy by size or morphological criteria. Normal common, internal, and external carotid arteries bilaterally. Normal vertebral arteries. Patent internal jugular veins bilaterally.",
        verbose: "No pathological cervical lymphadenopathy is identified by size or morphological criteria. The common, internal, and external carotid arteries are normal in caliber and enhancement bilaterally. The vertebral arteries are patent with normal caliber. The internal jugular veins are patent bilaterally with no evidence of thrombosis.",
      },
      {
        label: "CONCLUSION",
        concise: "Normal neck CT. No acute pathology.",
        semiconcise: "Normal neck CT examination. No masses, collections, or pathological lymphadenopathy.",
        verbose: "Normal neck CT examination. No masses, collections, or pathological lymphadenopathy identified.",
        isConclusion: true,
      },
      {
        label: "RECOMMENDATIONS",
        concise: "No further imaging required. Clinical correlation advised.",
        semiconcise: "No further imaging required based on these normal findings. Clinical correlation advised if symptoms persist.",
        verbose: "No further imaging is required based on these normal findings. Clinical correlation is advised if symptoms persist. Consider MRI for further soft tissue characterization if clinically warranted.",
        isConclusion: true,
      },
    ],
  },
  {
    id: "4.1.2",
    name: "CT Temporal Bones",
    category: "Neck",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "High-resolution CT of the temporal bones without contrast. Axial and coronal thin-section (0.6mm) acquisitions in bone algorithm.", editable: true, isHeader: true, techniques: ["High-resolution CT of the temporal bones without contrast. Axial and coronal thin-section (0.6mm) acquisitions in bone algorithm.", "CT temporal bones per departmental protocol. Sub-millimetre axial acquisitions with coronal reformats in bone and soft tissue windows.", "HRCT temporal bones. Thin-section axial and direct coronal acquisitions with bone algorithm reconstructions."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      {
        label: "MIDDLE AND INNER EAR",
        concise: "Normal middle ear cavities bilaterally. Intact ossicular chains. Normal cochlea and vestibular apparatus. Normal internal auditory canals.",
        semiconcise: "Normal middle ear cavities bilaterally with no opacification. Intact ossicular chains with normal malleoincudal and incudostapedial articulations. Normal cochlear turns (2.5) and vestibular apparatus bilaterally. Normal semicircular canals. Normal internal auditory canals with no widening.",
        verbose: "The middle ear cavities are well-aerated bilaterally with no opacification or soft tissue mass. The ossicular chains are intact bilaterally with normal malleoincudal and incudostapedial articulations. The cochlea demonstrates normal 2.5 turns bilaterally. The vestibular apparatus including the vestibule and semicircular canals appears normal. The internal auditory canals are of normal caliber bilaterally with no widening or erosion.",
      },
      {
        label: "EXTERNAL EAR AND MASTOID",
        concise: "Normal external auditory canals. Well-pneumatized mastoid air cells. Intact tegmen tympani.",
        semiconcise: "Normal external auditory canals with no stenosis or exostoses. Well-pneumatized mastoid air cells bilaterally with no opacification. Intact tegmen tympani and sigmoid plate bilaterally. Normal mastoid cortex.",
        verbose: "The external auditory canals are normal in caliber bilaterally with no stenosis, exostoses, or soft tissue mass. The mastoid air cells are well-pneumatized bilaterally with no opacification or coalescence. The tegmen tympani is intact bilaterally with no dehiscence. The sigmoid plate is intact bilaterally. The mastoid cortex shows no erosion.",
      },
      {
        label: "CONCLUSION",
        concise: "Normal temporal bones bilaterally.",
        semiconcise: "Normal temporal bones bilaterally. No evidence of middle ear, inner ear, or mastoid pathology.",
        verbose: "Normal temporal bones bilaterally. No evidence of middle ear, inner ear, or mastoid pathology.",
        isConclusion: true,
      },
      {
        label: "RECOMMENDATIONS",
        concise: "No further imaging required. Clinical and audiological correlation advised.",
        semiconcise: "No further imaging required based on these normal findings. Clinical and audiological correlation advised if symptoms persist.",
        verbose: "No further imaging is required based on these normal findings. Clinical and audiological correlation is advised if symptoms persist. Consider MRI with dedicated internal auditory canal sequences if sensorineural hearing loss or vestibular schwannoma is clinically suspected.",
        isConclusion: true,
      },
    ],
  },
  {
    id: "4.1.3",
    name: "CT Orbits",
    category: "Neck",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "CT of the orbits with intravenous contrast. Axial and coronal thin-section acquisitions.", editable: true, isHeader: true, techniques: ["CT of the orbits with intravenous contrast. Axial and coronal thin-section acquisitions.", "CT orbits without contrast per trauma protocol. Axial and coronal thin-section acquisitions in bone and soft tissue windows.", "CT orbits with IV contrast. Thin-section axial acquisitions with coronal and sagittal reformats."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      {
        label: "ORBITAL CONTENTS",
        concise: "Normal globes and extraocular muscles bilaterally. Normal optic nerves. No retrobulbar masses.",
        semiconcise: "Normal globes bilaterally with no lens dislocation or intraocular pathology. Normal extraocular muscles in size and configuration. Normal optic nerves and optic nerve sheaths. No retrobulbar masses or fat stranding. Normal lacrimal glands.",
        verbose: "The globes are normal bilaterally with no lens dislocation, vitreous hemorrhage, or intraocular pathology apparent on CT. The extraocular muscles demonstrate normal size and configuration bilaterally including the medial, lateral, superior, inferior recti, and oblique muscles. The optic nerves and optic nerve sheaths appear normal in caliber and signal. No retrobulbar masses, fat stranding, or abnormal enhancement is identified. The lacrimal glands are normal in size and attenuation.",
      },
      {
        label: "ORBITAL WALLS",
        concise: "Intact orbital walls bilaterally. No fractures. Normal paranasal sinuses.",
        semiconcise: "Intact orbital walls bilaterally with no fractures or dehiscence. Normal orbital foramina. Clear paranasal sinuses including ethmoid air cells.",
        verbose: "The orbital walls are intact bilaterally with no fractures, blow-out deformities, or dehiscence. The orbital foramina including the superior and inferior orbital fissures are normal. The paranasal sinuses including the ethmoid air cells, maxillary sinuses, and frontal sinuses are clear.",
      },
      {
        label: "CONCLUSION",
        concise: "Normal orbits bilaterally. No acute pathology.",
        semiconcise: "Normal orbital CT examination. No masses, fractures, or significant pathology.",
        verbose: "Normal orbital CT examination bilaterally. No masses, fractures, or significant orbital pathology identified.",
        isConclusion: true,
      },
      {
        label: "RECOMMENDATIONS",
        concise: "No further orbital imaging required. Clinical and ophthalmological correlation advised.",
        semiconcise: "No further orbital imaging required based on these normal findings. Clinical and ophthalmological correlation advised if symptoms persist.",
        verbose: "No further orbital imaging is required based on these normal findings. Clinical and ophthalmological correlation is advised if symptoms persist. Consider MRI for further soft tissue characterization if clinically warranted.",
        isConclusion: true,
      },
    ],
  },
  {
    id: "5.1.1", name: "CT Abdomen and Pelvis", category: "Abdomen and Pelvis",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "Non-contrast CT of the abdomen and pelvis. Axial acquisitions with coronal and sagittal reformats.", editable: true, isHeader: true, techniques: ["Non-contrast CT of the abdomen and pelvis. Axial acquisitions with coronal and sagittal reformats.", "CT abdomen and pelvis without contrast. Standard departmental protocol with axial and multiplanar reformats."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      { label: "UPPER ABDOMINAL ORGANS", concise: "Normal liver, spleen, and pancreas. No focal lesions. Normal gallbladder and adrenal glands.", semiconcise: "Normal liver, spleen, and pancreas. No focal lesions. Normal gallbladder and adrenal glands.", verbose: "Normal liver, spleen, and pancreas. No focal lesions. Normal gallbladder and adrenal glands." },
      { label: "GENITOURINARY AND GASTROINTESTINAL TRACT", concise: "Normal kidneys with no masses or hydronephrosis. Normal urinary bladder. Normal bowel caliber. Age-appropriate pelvic organs.", semiconcise: "Normal kidneys with no masses or hydronephrosis. Normal urinary bladder. Normal bowel caliber. Age-appropriate pelvic organs.", verbose: "Normal kidneys with no masses or hydronephrosis. Normal urinary bladder. Normal bowel caliber. Age-appropriate pelvic organs." },
      { label: "VESSELS, LYMPH NODES AND BONES", concise: "Normal abdominal aorta and IVC. No lymphadenopathy. No free fluid. Normal osseous structures.", semiconcise: "Normal abdominal aorta and IVC. No lymphadenopathy. No free fluid. Normal osseous structures.", verbose: "Normal abdominal aorta and IVC. No lymphadenopathy. No free fluid. Normal osseous structures." },
      { label: "CONCLUSION", concise: "Normal non-contrast examination of abdomen and pelvis.", semiconcise: "Normal non-contrast examination of abdomen and pelvis.", verbose: "Normal non-contrast examination of abdomen and pelvis.", isConclusion: true },
      { label: "RECOMMENDATIONS", concise: "Consider contrast-enhanced examination if enhanced assessment needed. Clinical correlation advised.", semiconcise: "Consider contrast-enhanced examination if enhanced assessment needed. Clinical correlation advised.", verbose: "Consider contrast-enhanced examination if enhanced assessment needed. Clinical correlation advised.", isConclusion: true },
    ],
  },
  {
    id: "5.2.1", name: "CT KUB", category: "Abdomen and Pelvis",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "Non-contrast CT KUB (kidneys, ureters, bladder). Low-dose protocol. Axial acquisitions with coronal and sagittal reformats.", editable: true, isHeader: true, techniques: ["Non-contrast CT KUB (kidneys, ureters, bladder). Low-dose protocol. Axial acquisitions with coronal and sagittal reformats.", "CT KUB without contrast per renal colic protocol. Low-dose axial acquisitions with multiplanar reformats.", "Non-contrast CT KUB. Standard-dose axial acquisitions with coronal reformats."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      { label: "URINARY TRACT", concise: "Normal kidneys with no calculi or hydronephrosis. Normal ureters throughout course. Normal urinary bladder with no calculi.", semiconcise: "Normal kidneys with no calculi or hydronephrosis. Normal ureters throughout course. Normal urinary bladder with no calculi.", verbose: "Normal kidneys with no calculi or hydronephrosis. Normal ureters throughout course. Normal urinary bladder with no calculi." },
      { label: "ADDITIONAL STRUCTURES", concise: "Normal abdominal organs and bowel caliber. Normal osseous structures.", semiconcise: "Normal abdominal organs and bowel caliber. Normal osseous structures.", verbose: "Normal abdominal organs and bowel caliber. Normal osseous structures." },
      { label: "CONCLUSION", concise: "Normal KUB examination. No evidence of urinary tract calculi.", semiconcise: "Normal KUB examination. No evidence of urinary tract calculi.", verbose: "Normal KUB examination. No evidence of urinary tract calculi.", isConclusion: true },
      { label: "RECOMMENDATIONS", concise: "No radiological follow-up required. Clinical correlation advised if symptoms persist.", semiconcise: "No radiological follow-up required. Clinical correlation advised if symptoms persist.", verbose: "No radiological follow-up required. Clinical correlation advised if symptoms persist.", isConclusion: true },
    ],
  },
  {
    id: "5.2.2", name: "CT Urogram", category: "Abdomen and Pelvis",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "CT urogram with intravenous contrast. Non-contrast, nephrographic, and excretory phase acquisitions with coronal and sagittal reformats.", editable: true, isHeader: true, techniques: ["CT urogram with intravenous contrast. Non-contrast, nephrographic, and excretory phase acquisitions with coronal and sagittal reformats.", "CT urogram per departmental protocol. Pre-contrast, arterial, nephrographic, and delayed excretory phases with multiplanar reformats.", "CT urogram with IV contrast. Triphasic acquisition with delayed excretory images and MIP reconstructions."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      { label: "KIDNEYS AND EXCRETION", concise: "Normal kidney size and enhancement. Symmetric contrast excretion. Normal pelvicalyceal systems. No renal calculi.", semiconcise: "Normal kidney size and enhancement. Symmetric contrast excretion. Normal pelvicalyceal systems. No renal calculi.", verbose: "Normal kidney size and enhancement. Symmetric contrast excretion. Normal pelvicalyceal systems. No renal calculi." },
      { label: "URETERS AND BLADDER", concise: "Normal ureteral caliber with complete opacification. No filling defects or strictures. Normal bladder with smooth contours.", semiconcise: "Normal ureteral caliber with complete opacification. No filling defects or strictures. Normal bladder with smooth contours.", verbose: "Normal ureteral caliber with complete opacification. No filling defects or strictures. Normal bladder with smooth contours." },
      { label: "CONCLUSION", concise: "Normal urogram. No evidence of urinary tract pathology.", semiconcise: "Normal urogram. No evidence of urinary tract pathology.", verbose: "Normal urogram. No evidence of urinary tract pathology.", isConclusion: true },
      { label: "RECOMMENDATIONS", concise: "No radiological follow-up required. Clinical correlation advised if symptoms persist.", semiconcise: "No radiological follow-up required. Clinical correlation advised if symptoms persist.", verbose: "No radiological follow-up required. Clinical correlation advised if symptoms persist.", isConclusion: true },
    ],
  },
  {
    id: "5.3.1", name: "CT Pelvis", category: "Abdomen and Pelvis",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "CT of the pelvis with intravenous contrast administration. Axial acquisitions with coronal and sagittal reformats.", editable: true, isHeader: true, techniques: ["CT of the pelvis with intravenous contrast administration. Axial acquisitions with coronal and sagittal reformats.", "Non-contrast CT pelvis per trauma protocol. Axial acquisitions with multiplanar reformats in bone and soft tissue windows.", "CT pelvis without contrast. Axial acquisitions with coronal and sagittal reformats."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      { label: "PELVIC BONES AND JOINTS", concise: "Normal pelvic ring alignment. No fractures. Intact acetabula and hip joints. Normal sacrum and coccyx.", semiconcise: "Normal pelvic ring alignment. No fractures. Intact acetabula and hip joints. Normal sacrum and coccyx.", verbose: "Normal pelvic ring alignment. No fractures. Intact acetabula and hip joints. Normal sacrum and coccyx." },
      { label: "PELVIC ORGANS AND SOFT TISSUES", concise: "Normal urinary bladder. Age-appropriate pelvic viscera. No soft tissue abnormalities.", semiconcise: "Normal urinary bladder. Age-appropriate pelvic viscera. No soft tissue abnormalities.", verbose: "Normal urinary bladder. Age-appropriate pelvic viscera. No soft tissue abnormalities." },
      { label: "CONCLUSION", concise: "Normal pelvis examination. No evidence of traumatic injury.", semiconcise: "Normal pelvis examination. No evidence of traumatic injury.", verbose: "Normal pelvis examination. No evidence of traumatic injury.", isConclusion: true },
      { label: "RECOMMENDATIONS", concise: "No immediate radiological follow-up required. Clinical correlation per trauma protocols advised.", semiconcise: "No immediate radiological follow-up required. Clinical correlation per trauma protocols advised.", verbose: "No immediate radiological follow-up required. Clinical correlation per trauma protocols advised.", isConclusion: true },
    ],
  },
  {
    id: "5.4.1", name: "MRCP", category: "Abdomen and Pelvis",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "MRI of the abdomen with MRCP sequences. Coronal and axial T2-weighted, heavily T2-weighted cholangiographic sequences, and 3D MIP reconstructions.", editable: true, isHeader: true, techniques: ["MRI of the abdomen with MRCP sequences. Coronal and axial T2-weighted, heavily T2-weighted cholangiographic sequences, and 3D MIP reconstructions.", "MRCP per departmental protocol. T2-weighted single-shot and 3D sequences with MIP reformats. Pre- and post-secretin administration.", "MRCP with standard sequences including coronal thick-slab and thin-section T2-weighted acquisitions with MIP reconstructions."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      { label: "BILIARY SYSTEM", concise: "Normal common bile duct caliber (5mm). Normal intrahepatic biliary ducts. Normal gallbladder.", semiconcise: "Normal common bile duct caliber (5mm). Normal intrahepatic biliary ducts. Normal gallbladder.", verbose: "Normal common bile duct caliber (5mm). Normal intrahepatic biliary ducts. Normal gallbladder." },
      { label: "PANCREATIC SYSTEM", concise: "Normal pancreatic duct caliber (2mm). Normal pancreatic parenchyma. No focal lesions.", semiconcise: "Normal pancreatic duct caliber (2mm). Normal pancreatic parenchyma. No focal lesions.", verbose: "Normal pancreatic duct caliber (2mm). Normal pancreatic parenchyma. No focal lesions." },
      { label: "CONCLUSION", concise: "Normal MRCP. No biliary or pancreatic ductal abnormality.", semiconcise: "Normal MRCP. No biliary or pancreatic ductal abnormality.", verbose: "Normal MRCP. No biliary or pancreatic ductal abnormality.", isConclusion: true },
      { label: "RECOMMENDATIONS", concise: "No radiological follow-up required. Clinical correlation advised if symptoms persist.", semiconcise: "No radiological follow-up required. Clinical correlation advised if symptoms persist.", verbose: "No radiological follow-up required. Clinical correlation advised if symptoms persist.", isConclusion: true },
    ],
  },
  {
    id: "6.1.1", name: "CTA Lower Limbs", category: "Vascular System",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "CT angiography of the lower limbs with intravenous contrast. Bolus-tracked acquisition from aortic bifurcation to feet. Axial acquisitions with MIP, MPR, and 3D VRT reconstructions.", editable: true, isHeader: true, techniques: ["CT angiography of the lower limbs with intravenous contrast. Bolus-tracked acquisition from aortic bifurcation to feet. Axial acquisitions with MIP, MPR, and 3D VRT reconstructions.", "CTA lower limbs with IV contrast per peripheral vascular protocol. Arterial phase acquisition with multiplanar, MIP, and volume-rendered reformats.", "CT angiography bilateral lower limbs. Bolus-tracked contrast injection with arterial phase acquisition from infrarenal aorta to pedal arteries."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      { label: "BILATERAL LOWER LIMB ARTERIES", concise: "Patent iliac, femoral, popliteal, and tibial arteries bilaterally. Normal caliber and enhancement. No stenosis, occlusion, or aneurysm.", semiconcise: "Patent iliac, femoral, popliteal, and tibial arteries bilaterally. Normal caliber and enhancement. No stenosis, occlusion, or aneurysm.", verbose: "Patent iliac, femoral, popliteal, and tibial arteries bilaterally. Normal caliber and enhancement. No stenosis, occlusion, or aneurysm." },
      { label: "SOFT TISSUES", concise: "Normal soft tissues and osseous structures. No masses or collections.", semiconcise: "Normal soft tissues and osseous structures. No masses or collections.", verbose: "Normal soft tissues and osseous structures. No masses or collections." },
      { label: "CONCLUSION", concise: "Normal lower limb arterial system bilaterally.", semiconcise: "Normal lower limb arterial system bilaterally.", verbose: "Normal lower limb arterial system bilaterally.", isConclusion: true },
      { label: "RECOMMENDATIONS", concise: "No follow-up vascular imaging required. Clinical correlation advised if symptoms persist.", semiconcise: "No follow-up vascular imaging required. Clinical correlation advised if symptoms persist.", verbose: "No follow-up vascular imaging required. Clinical correlation advised if symptoms persist.", isConclusion: true },
    ],
  },
  {
    id: "6.1.2", name: "CT Right Upper Limb", category: "Vascular System",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "CT angiography of the right upper limb with intravenous contrast. Bolus-tracked arterial phase acquisition with MIP, MPR, and 3D VRT reconstructions.", editable: true, isHeader: true, techniques: ["CT angiography of the right upper limb with intravenous contrast. Bolus-tracked arterial phase acquisition with MIP, MPR, and 3D VRT reconstructions.", "CTA right upper limb with IV contrast. Arterial phase imaging from subclavian to palmar arch with multiplanar and MIP reformats."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      { label: "RIGHT UPPER LIMB ARTERIES", concise: "Patent subclavian, axillary, brachial, radial, and ulnar arteries. Normal caliber with good distal runoff. Intact palmar arch.", semiconcise: "Patent subclavian, axillary, brachial, radial, and ulnar arteries. Normal caliber with good distal runoff. Intact palmar arch.", verbose: "Patent subclavian, axillary, brachial, radial, and ulnar arteries. Normal caliber with good distal runoff. Intact palmar arch." },
      { label: "SOFT TISSUES", concise: "Normal soft tissues and osseous structures.", semiconcise: "Normal soft tissues and osseous structures.", verbose: "Normal soft tissues and osseous structures." },
      { label: "CONCLUSION", concise: "Normal right upper limb arterial system.", semiconcise: "Normal right upper limb arterial system.", verbose: "Normal right upper limb arterial system.", isConclusion: true },
      { label: "RECOMMENDATIONS", concise: "No follow-up vascular imaging required. Clinical correlation advised if symptoms persist.", semiconcise: "No follow-up vascular imaging required. Clinical correlation advised if symptoms persist.", verbose: "No follow-up vascular imaging required. Clinical correlation advised if symptoms persist.", isConclusion: true },
    ],
  },
  {
    id: "6.2.1", name: "CT Abdomen and Pelvis (Aneurysm Planning)", category: "Vascular System",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "CT angiography of the abdomen and pelvis with intravenous contrast for aortic aneurysm assessment. Arterial phase acquisition with multiplanar, MIP, and 3D VRT reconstructions. Centreline measurements obtained.", editable: true, isHeader: true, techniques: ["CT angiography of the abdomen and pelvis with intravenous contrast for aortic aneurysm assessment. Arterial phase acquisition with multiplanar, MIP, and 3D VRT reconstructions. Centreline measurements obtained.", "CTA abdomen and pelvis per aneurysm surveillance protocol. Arterial phase with multiplanar reformats and centreline analysis.", "CT aortogram with IV contrast for EVAR planning. Arterial phase thin-section acquisitions with 3D reconstructions and centreline measurements."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      { label: "AORTIC MEASUREMENTS", concise: "Normal aortic caliber throughout course. Coeliac axis: 1.8cm, SMA level: 1.7cm, renal level: 1.6cm, infrarenal: 1.5cm. No aneurysmal dilatation.", semiconcise: "Normal aortic caliber throughout course. Coeliac axis: 1.8cm, SMA level: 1.7cm, renal level: 1.6cm, infrarenal: 1.5cm. No aneurysmal dilatation.", verbose: "Normal aortic caliber throughout course. Coeliac axis: 1.8cm, SMA level: 1.7cm, renal level: 1.6cm, infrarenal: 1.5cm. No aneurysmal dilatation." },
      { label: "BRANCH VESSELS", concise: "Patent coeliac, SMA, IMA, and renal arteries. Normal common iliac arteries (R: 0.9cm, L: 0.8cm).", semiconcise: "Patent coeliac, SMA, IMA, and renal arteries. Normal common iliac arteries (R: 0.9cm, L: 0.8cm).", verbose: "Patent coeliac, SMA, IMA, and renal arteries. Normal common iliac arteries (R: 0.9cm, L: 0.8cm)." },
      { label: "CONCLUSION", concise: "Normal abdominal aorta. No evidence of aneurysmal disease.", semiconcise: "Normal abdominal aorta. No evidence of aneurysmal disease.", verbose: "Normal abdominal aorta. No evidence of aneurysmal disease.", isConclusion: true },
      { label: "RECOMMENDATIONS", concise: "No aneurysm surveillance required. Routine cardiovascular risk management advised.", semiconcise: "No aneurysm surveillance required. Routine cardiovascular risk management advised.", verbose: "No aneurysm surveillance required. Routine cardiovascular risk management advised.", isConclusion: true },
    ],
  },
  {
    id: "6.2.2", name: "CT Abdomen and Pelvis (EVAR Follow Up)", category: "Vascular System",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "CT angiography of the abdomen and pelvis for post-EVAR surveillance. Non-contrast and arterial phase acquisitions with delayed images. Multiplanar and 3D reconstructions.", editable: true, isHeader: true, techniques: ["CT angiography of the abdomen and pelvis for post-EVAR surveillance. Non-contrast and arterial phase acquisitions with delayed images. Multiplanar and 3D reconstructions.", "Post-EVAR surveillance CT per departmental protocol. Pre-contrast, arterial, and delayed phase acquisitions with multiplanar reformats.", "CT aortogram for EVAR follow-up. Triphasic protocol with non-contrast, arterial, and delayed acquisitions."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      { label: "ENDOGRAFT ASSESSMENT", concise: "Well-positioned bifurcated aortic endograft. No migration or kinking. Patent throughout with normal contrast opacification. No endoleak.", semiconcise: "Well-positioned bifurcated aortic endograft. No migration or kinking. Patent throughout with normal contrast opacification. No endoleak.", verbose: "Well-positioned bifurcated aortic endograft. No migration or kinking. Patent throughout with normal contrast opacification. No endoleak." },
      { label: "ANEURYSM SAC AND VESSELS", concise: "Stable aneurysm sac (5.2cm). Patent renal and visceral arteries. Patent iliac arteries bilaterally.", semiconcise: "Stable aneurysm sac (5.2cm). Patent renal and visceral arteries. Patent iliac arteries bilaterally.", verbose: "Stable aneurysm sac (5.2cm). Patent renal and visceral arteries. Patent iliac arteries bilaterally." },
      { label: "CONCLUSION", concise: "Satisfactory EVAR appearance. No endoleak, migration, or graft occlusion.", semiconcise: "Satisfactory EVAR appearance. No endoleak, migration, or graft occlusion.", verbose: "Satisfactory EVAR appearance. No endoleak, migration, or graft occlusion.", isConclusion: true },
      { label: "RECOMMENDATIONS", concise: "Continue standard post-EVAR surveillance. Clinical follow-up for symptoms.", semiconcise: "Continue standard post-EVAR surveillance. Clinical follow-up for symptoms.", verbose: "Continue standard post-EVAR surveillance. Clinical follow-up for symptoms.", isConclusion: true },
    ],
  },
  {
    id: "6.2.3", name: "CT Thorax, Abdomen and Pelvis (Aortogram)", category: "Vascular System",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "CT angiography of the thorax, abdomen, and pelvis with intravenous contrast. ECG-gated thoracic acquisition. Arterial phase with multiplanar, MIP, and 3D VRT reconstructions.", editable: true, isHeader: true, techniques: ["CT angiography of the thorax, abdomen, and pelvis with intravenous contrast. ECG-gated thoracic acquisition. Arterial phase with multiplanar, MIP, and 3D VRT reconstructions.", "CT aortogram from thoracic inlet to femoral bifurcation with IV contrast. Bolus-tracked arterial phase acquisition with multiplanar reformats.", "CT angiography thorax, abdomen and pelvis. ECG-gated arterial phase acquisition with MIP, centreline, and 3D volume-rendered reconstructions."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      { label: "THORACIC AORTA", concise: "Normal ascending aorta (3.2cm), arch (2.8cm), and descending aorta (2.1cm at diaphragm). Patent great vessels.", semiconcise: "Normal ascending aorta (3.2cm), arch (2.8cm), and descending aorta (2.1cm at diaphragm). Patent great vessels.", verbose: "Normal ascending aorta (3.2cm), arch (2.8cm), and descending aorta (2.1cm at diaphragm). Patent great vessels." },
      { label: "ABDOMINAL AORTA", concise: "Normal caliber: coeliac level 2.0cm, SMA level 1.9cm, renal level 1.8cm, infrarenal 1.7cm. Normal bifurcation.", semiconcise: "Normal caliber: coeliac level 2.0cm, SMA level 1.9cm, renal level 1.8cm, infrarenal 1.7cm. Normal bifurcation.", verbose: "Normal caliber: coeliac level 2.0cm, SMA level 1.9cm, renal level 1.8cm, infrarenal 1.7cm. Normal bifurcation." },
      { label: "BRANCH VESSELS", concise: "Patent coeliac, SMA, IMA, and renal arteries. Normal iliac arteries.", semiconcise: "Patent coeliac, SMA, IMA, and renal arteries. Normal iliac arteries.", verbose: "Patent coeliac, SMA, IMA, and renal arteries. Normal iliac arteries." },
      { label: "CONCLUSION", concise: "Normal thoracic and abdominal aorta. No aneurysmal or stenotic disease.", semiconcise: "Normal thoracic and abdominal aorta. No aneurysmal or stenotic disease.", verbose: "Normal thoracic and abdominal aorta. No aneurysmal or stenotic disease.", isConclusion: true },
      { label: "RECOMMENDATIONS", concise: "No aortic surveillance required. Routine cardiovascular risk management advised.", semiconcise: "No aortic surveillance required. Routine cardiovascular risk management advised.", verbose: "No aortic surveillance required. Routine cardiovascular risk management advised.", isConclusion: true },
    ],
  },
  {
    id: "6.3.1", name: "CTA Aortic Arch, Carotids and Intracranial Arteries", category: "Vascular System",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "CT angiography from aortic arch to vertex with intravenous contrast. Bolus-tracked arterial phase acquisition with multiplanar, MIP, and 3D VRT reconstructions.", editable: true, isHeader: true, techniques: ["CT angiography from aortic arch to vertex with intravenous contrast. Bolus-tracked arterial phase acquisition with multiplanar, MIP, and 3D VRT reconstructions.", "CTA aortic arch, carotids, and circle of Willis with IV contrast. Arterial phase imaging with MIP and volume-rendered reformats.", "CT angiography arch to vertex per stroke protocol. Bolus-tracked acquisition with multiplanar and 3D reconstructions."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      { label: "AORTIC ARCH AND GREAT VESSELS", concise: "Normal aortic arch (2.7cm). Patent brachiocephalic, left carotid, and left subclavian arteries.", semiconcise: "Normal aortic arch (2.7cm). Patent brachiocephalic, left carotid, and left subclavian arteries.", verbose: "Normal aortic arch (2.7cm). Patent brachiocephalic, left carotid, and left subclavian arteries." },
      { label: "EXTRACRANIAL CAROTIDS", concise: "Patent bilateral carotid systems. Normal bifurcations at C4 level. Patent vertebral arteries.", semiconcise: "Patent bilateral carotid systems. Normal bifurcations at C4 level. Patent vertebral arteries.", verbose: "Patent bilateral carotid systems. Normal bifurcations at C4 level. Patent vertebral arteries." },
      { label: "INTRACRANIAL VESSELS", concise: "Patent intracranial carotid and vertebrobasilar systems. Complete circle of Willis. No aneurysm or stenosis.", semiconcise: "Patent intracranial carotid and vertebrobasilar systems. Complete circle of Willis. No aneurysm or stenosis.", verbose: "Patent intracranial carotid and vertebrobasilar systems. Complete circle of Willis. No aneurysm or stenosis." },
      { label: "CONCLUSION", concise: "Normal aortic arch, carotid, and intracranial vessels.", semiconcise: "Normal aortic arch, carotid, and intracranial vessels.", verbose: "Normal aortic arch, carotid, and intracranial vessels.", isConclusion: true },
      { label: "RECOMMENDATIONS", concise: "No follow-up vascular imaging required. Clinical correlation advised if symptoms persist.", semiconcise: "No follow-up vascular imaging required. Clinical correlation advised if symptoms persist.", verbose: "No follow-up vascular imaging required. Clinical correlation advised if symptoms persist.", isConclusion: true },
    ],
  },
  {
    id: "6.4.1", name: "CTA Renal and Visceral Arteries", category: "Vascular System",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "CT angiography of the abdomen with intravenous contrast for renal and visceral arterial assessment. Arterial phase acquisition with multiplanar, MIP, and 3D VRT reconstructions.", editable: true, isHeader: true, techniques: ["CT angiography of the abdomen with intravenous contrast for renal and visceral arterial assessment. Arterial phase acquisition with multiplanar, MIP, and 3D VRT reconstructions.", "CTA renal and visceral arteries with IV contrast. Bolus-tracked arterial phase with multiplanar and MIP reformats."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      { label: "RENAL ARTERIES", concise: "Normal renal arteries arising at L1-L2. Right: 5.2mm, Left: 5.0mm diameter. No stenosis or accessory vessels.", semiconcise: "Normal renal arteries arising at L1-L2. Right: 5.2mm, Left: 5.0mm diameter. No stenosis or accessory vessels.", verbose: "Normal renal arteries arising at L1-L2. Right: 5.2mm, Left: 5.0mm diameter. No stenosis or accessory vessels." },
      { label: "VISCERAL ARTERIES", concise: "Patent coeliac axis with normal trifurcation. Normal SMA (7.1mm at origin) and IMA. No stenosis.", semiconcise: "Patent coeliac axis with normal trifurcation. Normal SMA (7.1mm at origin) and IMA. No stenosis.", verbose: "Patent coeliac axis with normal trifurcation. Normal SMA (7.1mm at origin) and IMA. No stenosis." },
      { label: "CONCLUSION", concise: "Normal renal and visceral arteries. No stenotic or aneurysmal disease.", semiconcise: "Normal renal and visceral arteries. No stenotic or aneurysmal disease.", verbose: "Normal renal and visceral arteries. No stenotic or aneurysmal disease.", isConclusion: true },
      { label: "RECOMMENDATIONS", concise: "No follow-up vascular imaging required. Clinical correlation advised if symptoms persist.", semiconcise: "No follow-up vascular imaging required. Clinical correlation advised if symptoms persist.", verbose: "No follow-up vascular imaging required. Clinical correlation advised if symptoms persist.", isConclusion: true },
    ],
  },
  {
    id: "7.1.1", name: "CT Polytrauma", category: "Trauma",
    sections: [
      { label: "CLINICAL NOTES", text: "", editable: true, isHeader: true },
      { label: "TECHNIQUE", text: "CT of the head, cervical spine, chest, abdomen, and pelvis with intravenous contrast per major trauma protocol. Arterial and portal venous phase acquisitions with multiplanar reformats.", editable: true, isHeader: true, techniques: ["CT of the head, cervical spine, chest, abdomen, and pelvis with intravenous contrast per major trauma protocol. Arterial and portal venous phase acquisitions with multiplanar reformats.", "Whole-body CT per polytrauma protocol. Non-contrast head, contrast-enhanced chest, abdomen, and pelvis with cervical spine reformats. Arterial and portal venous phases.", "CT polytrauma scan. Non-contrast head followed by contrast-enhanced neck, chest, abdomen, and pelvis with bone and soft tissue reformats."] },
      { label: "FINDINGS", text: "", isHeader: true, divider: true },
      { label: "BRAIN AND CERVICAL SPINE", concise: "Normal brain with no hemorrhage or mass effect. Intact skull. Normal cervical spine alignment with no fractures.", semiconcise: "Normal brain with no hemorrhage or mass effect. Intact skull. Normal cervical spine alignment with no fractures.", verbose: "Normal brain with no hemorrhage or mass effect. Intact skull. Normal cervical spine alignment with no fractures." },
      { label: "THORAX", concise: "Clear lungs with no contusion or pneumothorax. Normal mediastinum and thoracic aorta. Intact ribs and thoracic spine.", semiconcise: "Clear lungs with no contusion or pneumothorax. Normal mediastinum and thoracic aorta. Intact ribs and thoracic spine.", verbose: "Clear lungs with no contusion or pneumothorax. Normal mediastinum and thoracic aorta. Intact ribs and thoracic spine." },
      { label: "ABDOMEN AND PELVIS", concise: "Normal abdominal organs with no laceration or hematoma. No free fluid. Normal pelvis and hip joints.", semiconcise: "Normal abdominal organs with no laceration or hematoma. No free fluid. Normal pelvis and hip joints.", verbose: "Normal abdominal organs with no laceration or hematoma. No free fluid. Normal pelvis and hip joints." },
      { label: "CONCLUSION", concise: "Normal polytrauma study. No evidence of acute traumatic injury.", semiconcise: "Normal polytrauma study. No evidence of acute traumatic injury.", verbose: "Normal polytrauma study. No evidence of acute traumatic injury.", isConclusion: true },
      { label: "RECOMMENDATIONS", concise: "No follow-up imaging required. Clinical observation per trauma protocols advised.", semiconcise: "No follow-up imaging required. Clinical observation per trauma protocols advised.", verbose: "No follow-up imaging required. Clinical observation per trauma protocols advised.", isConclusion: true },
    ],
  },
];

interface TemplateSection {
  label: string;
  text?: string;
  editable?: boolean;
  isHeader?: boolean;
  divider?: boolean;
  concise?: string;
  semiconcise?: string;
  verbose?: string;
  isConclusion?: boolean;
  techniques?: string[];
  isCustom?: boolean;
  _origIndex?: number;
  _key?: string;
  _customIndex?: number;
}

interface Template {
  id: string;
  name: string;
  category: string;
  sections: TemplateSection[];
}

const CATEGORIES = [...new Set(TEMPLATES.map((t) => t.category))];

const CATEGORY_ICONS: Record<string, string> = {
  "Head and Brain": "\u{1F9E0}",
  Spine: "\u{1F9B4}",
  Chest: "\u{1FAC1}",
  Neck: "\u{1F464}",
  "Abdomen and Pelvis": "\u{1FA7B}",
  "Vascular System": "\u{2764}\u{FE0F}",
  Trauma: "\u{1F6A8}",
};

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  "Head and Brain": { bg: "rgba(129,140,248,0.12)", border: "#818CF8", text: "#A5B4FC" },
  Spine: { bg: "rgba(74,222,128,0.12)", border: "#4ADE80", text: "#86EFAC" },
  Chest: { bg: "rgba(251,146,60,0.12)", border: "#FB923C", text: "#FDBA74" },
  Neck: { bg: "rgba(192,132,252,0.12)", border: "#C084FC", text: "#D8B4FE" },
  "Abdomen and Pelvis": { bg: "rgba(248,113,113,0.12)", border: "#F87171", text: "#FCA5A5" },
  "Vascular System": { bg: "rgba(251,113,133,0.12)", border: "#FB7185", text: "#FDA4AF" },
  Trauma: { bg: "rgba(251,191,36,0.12)", border: "#FBBF24", text: "#FDE68A" },
};

type Verbosity = "concise" | "semiconcise" | "verbose";

export default function RadiologyTemplatesPage() {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [verbosity, setVerbosity] = useState<Verbosity>("concise");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [editedSections, setEditedSections] = useState<Record<string, string>>({});
  const [editedLabels, setEditedLabels] = useState<Record<string, string>>({});
  const [editedNames, setEditedNames] = useState<Record<string, string>>({});
  const [customSections, setCustomSections] = useState<Record<string, TemplateSection[]>>({});
  const [removedSections, setRemovedSections] = useState<Record<string, Record<number, boolean>>>({});
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [saveStatus, setSaveStatus] = useState<null | "saving" | "saved">(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  const STORAGE_KEY = "radreport-edits";

  const loadFromStorage = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data.editedSections) setEditedSections(data.editedSections);
        if (data.editedLabels) setEditedLabels(data.editedLabels);
        if (data.editedNames) setEditedNames(data.editedNames);
        if (data.customSections) setCustomSections(data.customSections);
        if (data.removedSections) setRemovedSections(data.removedSections);
        if (data.verbosity) setVerbosity(data.verbosity);
      }
    } catch {
      console.log("No saved data found, starting fresh.");
    }
    setStorageReady(true);
  };

  const saveToStorage = (data: unknown) => {
    try {
      setSaveStatus("saving");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 1500);
    } catch (e) {
      console.error("Failed to save:", e);
      setSaveStatus(null);
    }
  };

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (!storageReady || !mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveToStorage({
        editedSections,
        editedLabels,
        editedNames,
        customSections,
        removedSections,
        verbosity,
      });
    }, 800);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [editedSections, editedLabels, editedNames, customSections, removedSections, verbosity, storageReady]);

  const getTemplateName = (t: Template) => editedNames[t.id] || t.name;

  const selectedTemplate = TEMPLATES.find((t) => t.id === selectedTemplateId) || null;

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter((t) => {
      const name = getTemplateName(t);
      const matchesSearch =
        !searchQuery ||
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.includes(searchQuery);
      const matchesCategory = !activeCategory || t.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, activeCategory, editedNames]);

  const groupedTemplates = useMemo(() => {
    const groups: Record<string, Template[]> = {};
    filteredTemplates.forEach((t) => {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    });
    return groups;
  }, [filteredTemplates]);

  const getVisibleSections = (template: Template): TemplateSection[] => {
    const removed = removedSections[template.id] || {};
    const originals = template.sections
      .map((s, i) => ({ ...s, _origIndex: i, _key: `orig-${i}` }))
      .filter((_, i) => !removed[i]);
    const customs = (customSections[template.id] || []).map((s, i) => ({
      ...s,
      _key: `custom-${i}`,
      _customIndex: i,
    }));
    return [...originals, ...customs];
  };

  const getEditKey = (templateId: string, sectionKey: string) => `${templateId}-${sectionKey}`;

  const getVerbEditKey = (templateId: string, sectionKey: string) => `${templateId}-${sectionKey}-${verbosity}`;

  const getSectionText = (template: Template, section: TemplateSection) => {
    if (section.isHeader) {
      const editKey = getEditKey(template.id, section._key!);
      if (editedSections[editKey] !== undefined) return editedSections[editKey];
      return section.text || "";
    }
    if (section.divider) return "";
    if (section._key!.startsWith("custom-")) {
      const editKey = getEditKey(template.id, section._key!);
      if (editedSections[editKey] !== undefined) return editedSections[editKey];
      return section.text || "";
    }
    const verbKey = getVerbEditKey(template.id, section._key!);
    if (editedSections[verbKey] !== undefined) return editedSections[verbKey];
    if (verbosity === "verbose") return section.verbose || section.semiconcise || section.concise || "";
    if (verbosity === "semiconcise") return section.semiconcise || section.concise || "";
    return section.concise || "";
  };

  const getSectionLabel = (template: Template, section: TemplateSection) => {
    const labelKey = getEditKey(template.id, section._key!);
    if (editedLabels[labelKey] !== undefined) return editedLabels[labelKey];
    return section.label;
  };

  const handleSectionEdit = (templateId: string, sectionKey: string, value: string, section: TemplateSection) => {
    const isContent = section && !section.isHeader && !section.divider && !sectionKey.startsWith("custom-");
    const key = isContent ? `${templateId}-${sectionKey}-${verbosity}` : getEditKey(templateId, sectionKey);
    setEditedSections((prev) => ({ ...prev, [key]: value }));
  };

  const handleLabelEdit = (templateId: string, sectionKey: string, value: string) => {
    const labelKey = getEditKey(templateId, sectionKey);
    setEditedLabels((prev) => ({ ...prev, [labelKey]: value }));
  };

  const handleRemoveSection = (templateId: string, section: TemplateSection, allVisible: TemplateSection[]) => {
    const idx = allVisible.findIndex((s) => s._key === section._key);
    const currentText = getSectionText({ id: templateId, name: "", category: "", sections: [] }, section) || "";

    let prevSection: TemplateSection | null = null;
    for (let j = idx - 1; j >= 0; j--) {
      if (!allVisible[j].divider) {
        prevSection = allVisible[j];
        break;
      }
    }

    if (prevSection && currentText.trim()) {
      const prevText = getSectionText({ id: templateId, name: "", category: "", sections: [] }, prevSection) || "";
      const merged = prevText ? prevText.trimEnd() + "\n\n" + currentText.trim() : currentText.trim();
      const prevIsContent = !prevSection.isHeader && !prevSection.divider && !prevSection._key!.startsWith("custom-");
      const prevKey = prevIsContent ? `${templateId}-${prevSection._key}-${verbosity}` : getEditKey(templateId, prevSection._key!);
      setEditedSections((prev) => ({ ...prev, [prevKey]: merged }));
    }

    if (section._key!.startsWith("custom-")) {
      setCustomSections((prev) => {
        const list = [...(prev[templateId] || [])];
        list.splice(section._customIndex!, 1);
        return { ...prev, [templateId]: list };
      });
      const editKey = getEditKey(templateId, section._key!);
      setEditedSections((prev) => { const n = { ...prev }; delete n[editKey]; return n; });
      setEditedLabels((prev) => { const n = { ...prev }; delete n[editKey]; return n; });
    } else {
      setRemovedSections((prev) => ({
        ...prev,
        [templateId]: { ...(prev[templateId] || {}), [section._origIndex!]: true },
      }));
    }
  };

  const handleAddSection = (templateId: string) => {
    setCustomSections((prev) => ({
      ...prev,
      [templateId]: [
        ...(prev[templateId] || []),
        { label: "NEW SECTION", text: "", isCustom: true },
      ],
    }));
  };

  const generateReport = () => {
    if (!selectedTemplate) return "";
    const name = getTemplateName(selectedTemplate);
    let report = `${name.toUpperCase()}\n\n`;
    const sections = getVisibleSections(selectedTemplate);
    sections.forEach((section) => {
      const text = getSectionText(selectedTemplate, section);
      const label = getSectionLabel(selectedTemplate, section);
      if (section.divider) {
        report += `${label}:\n\n`;
      } else if (section.isHeader) {
        report += `${label}: ${text}\n\n`;
      } else if (section.isConclusion) {
        report += `${label}: ${text}\n\n`;
      } else {
        report += `${label}:\n${text}\n\n`;
      }
    });
    return report.trim();
  };

  const copyToClipboard = async () => {
    const report = generateReport();
    try {
      await navigator.clipboard.writeText(report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = report;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetTemplate = () => {
    if (!selectedTemplate) return;
    const tid = selectedTemplate.id;
    const newEdited = { ...editedSections };
    const newLabels = { ...editedLabels };
    Object.keys(newEdited).forEach((k) => { if (k.startsWith(tid + "-")) delete newEdited[k]; });
    Object.keys(newLabels).forEach((k) => { if (k.startsWith(tid + "-")) delete newLabels[k]; });
    setEditedSections(newEdited);
    setEditedLabels(newLabels);
    setEditedNames((prev) => { const n = { ...prev }; delete n[tid]; return n; });
    setCustomSections((prev) => { const n = { ...prev }; delete n[tid]; return n; });
    setRemovedSections((prev) => { const n = { ...prev }; delete n[tid]; return n; });
    setEditingName(false);
  };

  const resetAllData = () => {
    setEditedSections({});
    setEditedLabels({});
    setEditedNames({});
    setCustomSections({});
    setRemovedSections({});
    setEditingName(false);
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
  };
  void resetAllData;

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.scrollTop = 0;
    }
    setEditingName(false);
  }, [selectedTemplateId]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  return (
    <div style={{ display: "flex", height: "calc(100vh - 64px)", fontFamily: "'IBM Plex Sans', 'Segoe UI', system-ui, sans-serif", background: "#0B0F1A", color: "#CBD5E1", overflow: "hidden" }}>
      <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet" />

      {!storageReady ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 40 }}>{"\u{1FA7A}"}</div>
          <div style={{ fontSize: 14, color: "#64748B", fontWeight: 500 }}>Loading your templates...</div>
        </div>
      ) : (
      <>
      <div style={{
        width: sidebarOpen ? 320 : 0,
        minWidth: sidebarOpen ? 320 : 0,
        background: "#111827",
        borderRight: "1px solid #1E293B",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "all 0.25s ease",
      }}>
        <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #1E293B", flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg, #3B82F6, #6366F1)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 18 }}>
              {"\u{1FA7A}"}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.02em", color: "#F1F5F9" }}>RadReport</div>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>Template Repository</div>
            </div>
          </div>

          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "9px 12px 9px 36px",
                border: "1.5px solid #1E293B",
                borderRadius: 8,
                fontSize: 13,
                outline: "none",
                background: "#0F172A",
                boxSizing: "border-box",
                fontFamily: "inherit",
                color: "#E2E8F0",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#6366F1")}
              onBlur={(e) => (e.target.style.borderColor = "#1E293B")}
            />
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "#475569" }}>{"\u{1F50D}"}</span>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 10 }}>
            <button
              onClick={() => setActiveCategory(null)}
              style={{
                padding: "4px 10px",
                borderRadius: 20,
                border: "1.5px solid",
                borderColor: !activeCategory ? "#6366F1" : "#1E293B",
                background: !activeCategory ? "rgba(99,102,241,0.15)" : "transparent",
                color: !activeCategory ? "#A5B4FC" : "#64748B",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              All
            </button>
            {CATEGORIES.map((cat) => {
              const c = CATEGORY_COLORS[cat];
              const active = activeCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(active ? null : cat)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 20,
                    border: "1.5px solid",
                    borderColor: active ? c.border : "#1E293B",
                    background: active ? c.bg : "transparent",
                    color: active ? c.text : "#64748B",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                    fontFamily: "inherit",
                    transition: "all 0.15s",
                    whiteSpace: "nowrap",
                  }}
                >
                  {CATEGORY_ICONS[cat]} {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: "8px" }}>
          {Object.entries(groupedTemplates).map(([category, templates]) => (
            <div key={category} style={{ marginBottom: 8 }}>
              <div style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: CATEGORY_COLORS[category]?.text || "#64748B",
                padding: "8px 8px 4px",
              }}>
                {CATEGORY_ICONS[category]} {category}
              </div>
              {templates.map((t) => {
                const active = selectedTemplateId === t.id;
                const c = CATEGORY_COLORS[t.category];
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTemplateId(t.id)}
                    style={{
                      display: "block",
                      width: "100%",
                      padding: "10px 12px",
                      border: active ? `1.5px solid ${c.border}` : "1.5px solid transparent",
                      borderRadius: 8,
                      background: active ? c.bg : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      fontFamily: "inherit",
                      transition: "all 0.12s",
                      marginBottom: 2,
                    }}
                    onMouseEnter={(e) => {
                      if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                    }}
                    onMouseLeave={(e) => {
                      if (!active) e.currentTarget.style.background = "transparent";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: active ? c.text : "#94A3B8" }}>{getTemplateName(t)}</span>
                      <span style={{ fontSize: 10, fontFamily: "'IBM Plex Mono', monospace", color: "#475569", fontWeight: 500 }}>{t.id}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
          {filteredTemplates.length === 0 && (
            <div style={{ padding: 24, textAlign: "center", color: "#475569", fontSize: 13 }}>No templates match your search</div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{
          padding: "12px 24px",
          borderBottom: "1px solid #1E293B",
          background: "#111827",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              style={{
                padding: "6px 8px",
                border: "1.5px solid #1E293B",
                borderRadius: 6,
                background: "#0F172A",
                cursor: "pointer",
                fontSize: 16,
                lineHeight: 1,
                color: "#94A3B8",
              }}
            >
              {"\u2630"}
            </button>
            {selectedTemplate && (
              <div style={{ display: "flex", alignItems: "center" }}>
                <span style={{
                  fontSize: 10,
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  color: CATEGORY_COLORS[selectedTemplate.category]?.text,
                  background: CATEGORY_COLORS[selectedTemplate.category]?.bg,
                  padding: "2px 8px",
                  borderRadius: 4,
                  marginRight: 10,
                  border: `1px solid ${CATEGORY_COLORS[selectedTemplate.category]?.border}30`,
                }}>
                  {selectedTemplate.category}
                </span>
                {editingName ? (
                  <input
                    ref={nameInputRef}
                    value={getTemplateName(selectedTemplate)}
                    onChange={(e) => setEditedNames((prev) => ({ ...prev, [selectedTemplate.id]: e.target.value }))}
                    onBlur={() => setEditingName(false)}
                    onKeyDown={(e) => { if (e.key === "Enter") setEditingName(false); }}
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: "#F1F5F9",
                      letterSpacing: "-0.02em",
                      background: "#0F172A",
                      border: "1.5px solid #6366F1",
                      borderRadius: 6,
                      padding: "2px 8px",
                      outline: "none",
                      fontFamily: "inherit",
                      minWidth: 200,
                    }}
                  />
                ) : (
                  <span
                    onClick={() => setEditingName(true)}
                    title="Click to edit template name"
                    style={{
                      fontWeight: 700,
                      fontSize: 16,
                      color: "#F1F5F9",
                      letterSpacing: "-0.02em",
                      cursor: "pointer",
                      borderBottom: "1px dashed #334155",
                      paddingBottom: 1,
                    }}
                  >
                    {getTemplateName(selectedTemplate)}
                  </span>
                )}
                <span style={{ fontSize: 12, color: "#475569", marginLeft: 8, fontFamily: "'IBM Plex Mono', monospace" }}>
                  {selectedTemplate.id}
                </span>
              </div>
            )}
          </div>

          {selectedTemplate && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{
                display: "flex",
                background: "#0F172A",
                borderRadius: 8,
                padding: 3,
                border: "1px solid #1E293B",
              }}>
                {(["concise", "semiconcise", "verbose"] as Verbosity[]).map((v) => (
                  <button
                    key={v}
                    onClick={() => setVerbosity(v)}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 6,
                      border: "none",
                      background: verbosity === v ? "#1E293B" : "transparent",
                      color: verbosity === v ? "#E2E8F0" : "#64748B",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                      boxShadow: verbosity === v ? "0 1px 3px rgba(0,0,0,0.3)" : "none",
                      transition: "all 0.15s",
                      textTransform: "capitalize",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {v === "semiconcise" ? "Semi-Concise" : v}
                  </button>
                ))}
              </div>

              <button
                onClick={resetTemplate}
                style={{
                  padding: "7px 14px",
                  borderRadius: 6,
                  border: "1.5px solid #1E293B",
                  background: "transparent",
                  color: "#94A3B8",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#F87171"; e.currentTarget.style.color = "#F87171"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#1E293B"; e.currentTarget.style.color = "#94A3B8"; }}
              >
                {"\u21BA"} Reset
              </button>

              <button
                onClick={copyToClipboard}
                style={{
                  padding: "7px 18px",
                  borderRadius: 6,
                  border: "none",
                  background: copied ? "#059669" : "linear-gradient(135deg, #6366F1, #4F46E5)",
                  color: "white",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.2s",
                  boxShadow: "0 1px 6px rgba(99,102,241,0.3)",
                }}
              >
                {copied ? "\u2713 Copied!" : "\u{1F4CB} Copy Report"}
              </button>
              {saveStatus && (
                <span style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: saveStatus === "saved" ? "#4ADE80" : "#64748B",
                  marginLeft: 4,
                  transition: "color 0.3s",
                }}>
                  {saveStatus === "saving" ? "Saving..." : "\u2713 Saved"}
                </span>
              )}
            </div>
          )}
        </div>

        <div ref={editorRef} style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {!selectedTemplate ? (
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              color: "#475569",
              gap: 16,
            }}>
              <div style={{ fontSize: 56, opacity: 0.3 }}>{"\u{1FA7A}"}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: "#64748B" }}>Select a template to begin</div>
              <div style={{ fontSize: 13, maxWidth: 360, textAlign: "center", lineHeight: 1.6, color: "#475569" }}>
                Browse {TEMPLATES.length} radiology report templates across {CATEGORIES.length} categories. Edit inline, toggle verbosity, and copy to clipboard.
              </div>
            </div>
          ) : (
            <div style={{ maxWidth: 780, margin: "0 auto" }}>
              {(() => {
                const allVisible = getVisibleSections(selectedTemplate);
                return allVisible.map((section) => {
                if (section.divider) {
                  const label = getSectionLabel(selectedTemplate, section);
                  return (
                    <div key={section._key} style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginTop: 24,
                      marginBottom: 16,
                    }}>
                      <input
                        value={label}
                        onChange={(e) => handleLabelEdit(selectedTemplate.id, section._key!, e.target.value)}
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "#6366F1",
                          background: "transparent",
                          border: "none",
                          borderBottom: "2px solid #6366F133",
                          paddingBottom: 6,
                          outline: "none",
                          fontFamily: "inherit",
                          flex: 1,
                        }}
                      />
                      <button
                        onClick={() => handleRemoveSection(selectedTemplate.id, section, allVisible)}
                        title="Remove section"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#475569",
                          cursor: "pointer",
                          fontSize: 14,
                          padding: "2px 6px",
                          borderRadius: 4,
                          lineHeight: 1,
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#F87171")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
                      >
                        {"\u2715"}
                      </button>
                    </div>
                  );
                }

                const text = getSectionText(selectedTemplate, section);
                const label = getSectionLabel(selectedTemplate, section);
                const editKey = getEditKey(selectedTemplate.id, section._key!);
                const verbKey = getVerbEditKey(selectedTemplate.id, section._key!);
                const isContent = !section.isHeader && !section.divider && !section._key!.startsWith("custom-");
                const textModified = isContent ? editedSections[verbKey] !== undefined : editedSections[editKey] !== undefined;
                const isModified = textModified || editedLabels[editKey] !== undefined;

                return (
                  <div key={section._key} style={{ marginBottom: section.isConclusion ? 12 : 16 }}>
                    <div style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 5,
                    }}>
                      <input
                        value={label}
                        onChange={(e) => handleLabelEdit(selectedTemplate.id, section._key!, e.target.value)}
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          color: section.isConclusion ? "#E2E8F0" : "#94A3B8",
                          background: "transparent",
                          border: "1px solid transparent",
                          borderRadius: 4,
                          padding: "2px 4px",
                          outline: "none",
                          fontFamily: "inherit",
                          flex: 1,
                          minWidth: 0,
                          transition: "border-color 0.15s",
                        }}
                        onFocus={(e) => (e.target.style.borderColor = "#334155")}
                        onBlur={(e) => (e.target.style.borderColor = "transparent")}
                      />
                      {isModified && (
                        <span style={{
                          fontSize: 9,
                          fontWeight: 700,
                          color: "#FBBF24",
                          background: "rgba(251,191,36,0.1)",
                          padding: "1px 6px",
                          borderRadius: 4,
                          border: "1px solid rgba(251,191,36,0.25)",
                          flexShrink: 0,
                        }}>
                          EDITED
                        </span>
                      )}
                      <button
                        onClick={() => handleRemoveSection(selectedTemplate.id, section, allVisible)}
                        title="Remove section"
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#475569",
                          cursor: "pointer",
                          fontSize: 13,
                          padding: "2px 6px",
                          borderRadius: 4,
                          lineHeight: 1,
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = "#F87171")}
                        onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}
                      >
                        {"\u2715"}
                      </button>
                    </div>
                    {section.techniques && section.techniques.length > 0 && (
                      <select
                        value={text && section.techniques.includes(text) ? text : ""}
                        onChange={(e) => {
                          if (e.target.value) handleSectionEdit(selectedTemplate.id, section._key!, e.target.value, section);
                        }}
                        style={{
                          width: "100%",
                          padding: "8px 12px",
                          border: "1.5px solid #1E293B",
                          borderRadius: 8,
                          fontSize: 12,
                          fontFamily: "inherit",
                          color: "#94A3B8",
                          background: "#0F172A",
                          outline: "none",
                          cursor: "pointer",
                          marginBottom: 6,
                          boxSizing: "border-box",
                          appearance: "none",
                          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2364748B' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
                          backgroundRepeat: "no-repeat",
                          backgroundPosition: "right 12px center",
                          paddingRight: 32,
                        }}
                      >
                        <option value="">Select a technique preset...</option>
                        {section.techniques.map((t, ti) => (
                          <option key={ti} value={t} style={{ color: "#E2E8F0", background: "#0F172A" }}>
                            {t.length > 100 ? t.substring(0, 100) + "..." : t}
                          </option>
                        ))}
                      </select>
                    )}
                    <textarea
                      value={text}
                      onChange={(e) => handleSectionEdit(selectedTemplate.id, section._key!, e.target.value, section)}
                      placeholder={section.isHeader || section.editable ? `Enter ${label.toLowerCase()}...` : ""}
                      rows={
                        (section.isHeader || section.editable) && !text
                          ? 1
                          : Math.max(2, Math.ceil(text.length / 90))
                      }
                      style={{
                        width: "100%",
                        padding: "10px 14px",
                        border: `1.5px solid ${section.isConclusion ? "#334155" : "#1E293B"}`,
                        borderRadius: 8,
                        fontSize: 13,
                        lineHeight: 1.65,
                        fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
                        color: "#E2E8F0",
                        background: section.isConclusion ? "#0F172A" : "#111827",
                        resize: "vertical",
                        outline: "none",
                        boxSizing: "border-box",
                        transition: "border-color 0.15s, box-shadow 0.15s",
                        fontWeight: section.isConclusion ? 500 : 400,
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = "#6366F1";
                        e.target.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)";
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = section.isConclusion ? "#334155" : "#1E293B";
                        e.target.style.boxShadow = "none";
                      }}
                    />
                  </div>
                );
              });
              })()}

              <button
                onClick={() => handleAddSection(selectedTemplate.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                  width: "100%",
                  padding: "10px",
                  border: "1.5px dashed #1E293B",
                  borderRadius: 8,
                  background: "transparent",
                  color: "#475569",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  transition: "all 0.15s",
                  marginTop: 8,
                  marginBottom: 24,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "#6366F1";
                  e.currentTarget.style.color = "#6366F1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "#1E293B";
                  e.currentTarget.style.color = "#475569";
                }}
              >
                + Add Section
              </button>

              <div style={{
                marginTop: 32,
                borderTop: "2px solid #1E293B",
                paddingTop: 20,
              }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 14,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#64748B" }}>
                    {"\u{1F4C4}"} Report Preview
                  </span>
                  <button
                    onClick={copyToClipboard}
                    style={{
                      padding: "5px 12px",
                      borderRadius: 5,
                      border: "1.5px solid #1E293B",
                      background: "transparent",
                      color: "#6366F1",
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    {copied ? "\u2713 Copied" : "Copy"}
                  </button>
                </div>
                <pre style={{
                  background: "#020617",
                  color: "#94A3B8",
                  padding: 20,
                  borderRadius: 10,
                  fontSize: 12,
                  lineHeight: 1.7,
                  fontFamily: "'IBM Plex Mono', monospace",
                  whiteSpace: "pre-wrap",
                  wordWrap: "break-word",
                  overflow: "auto",
                  maxHeight: 400,
                  border: "1px solid #1E293B",
                }}>
                  {generateReport()}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
      </>
      )}
    </div>
  );
}
