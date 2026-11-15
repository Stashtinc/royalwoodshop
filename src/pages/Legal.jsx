import { termsBlocks, privacyBlocks } from '../data/legalText'

function LegalPage({ title, intro, blocks }) {
  return (
    <>
      <section className="w-full bg-[#fbfbfb] py-16 lg:py-20">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-6 px-6 lg:px-8">
          <h1 className="font-serif text-3xl font-bold text-royal-blue lg:text-[36px]">{title}</h1>
          {intro && (
            <p className="max-w-[640px] font-sans text-lg leading-relaxed text-gray-600">{intro}</p>
          )}
        </div>
      </section>

      <section className="w-full bg-white py-16 lg:py-20">
        <div className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 lg:px-8">
          {blocks.map((block, i) =>
            block.h ? (
              <h2 key={i} className="pt-4 font-serif text-xl font-bold text-[#24140d]">
                {block.h}
              </h2>
            ) : (
              <p key={i} className="font-sans text-base leading-relaxed text-gray-600">
                {block.p}
              </p>
            ),
          )}
        </div>
      </section>
    </>
  )
}

export function TermsAndConditions() {
  return (
    <LegalPage
      title="Terms and Conditions"
      intro="Please carefully review our terms and conditions and let us know if you have any questions."
      blocks={termsBlocks.slice(1)}
    />
  )
}

export function PrivacyPolicy() {
  return <LegalPage title="Privacy Policy" blocks={privacyBlocks} />
}
