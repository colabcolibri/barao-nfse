'use strict';

const { SignedXml } = require('xml-crypto');

/**
 * Assina o elemento <infDPS> (ou <infPedReg>) com XMLDSig (RSA-SHA256 / SHA-256 / C14N).
 */
function assinarXmlNacional(xml, nodeTag, keyPem, certBase64) {
  const sig = new SignedXml({
    privateKey: keyPem,
    publicCert: `-----BEGIN CERTIFICATE-----\n${certBase64}\n-----END CERTIFICATE-----`,
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    signatureAlgorithm: 'http://www.w3.org/2001/04/xmldsig-more#rsa-sha256'
  });

  sig.addReference({
    xpath: `//*[local-name(.)='${nodeTag}']`,
    digestAlgorithm: 'http://www.w3.org/2001/04/xmlenc#sha256',
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315'
    ]
  });

  sig.computeSignature(xml, {
    location: { reference: `//*[local-name(.)='${nodeTag}']`, action: 'after' }
  });

  return sig.getSignedXml();
}

module.exports = { assinarXmlNacional };
