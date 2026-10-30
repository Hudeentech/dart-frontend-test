import svgPaths from "./svg-hiv8544hsw"
import { imgGroup } from "./svg-zd83x"

function Frame() {
  return (
    <button className="content-stretch cursor-pointer flex items-center relative rounded-[100px] shrink-0">
      <div
        className="overflow-clip relative shrink-0 size-[32px]"
        data-name="fi-rr-arrow-small-left"
      >
        <div
          className="absolute bottom-[25.04%] left-1/4 right-[16.67%] top-1/4"
          data-name="Vector"
        >
          <svg
            className="absolute block inset-0 size-full"
            fill="none"
            height="15.9885"
            preserveAspectRatio="none"
            viewBox="0 0 18.6667 15.9885"
            width="18.6667"
          >
            <path d={svgPaths.p29cd8d80} fill="#212529" id="Vector" />
          </svg>
        </div>
      </div>
    </button>
  )
}

function Frame3() {
  return (
    <div className="-translate-x-1/2 absolute content-stretch flex items-center left-1/2 top-[74px] w-[380px]">
      <Frame />
    </div>
  )
}

function Time1() {
  return (
    <div className="h-[13px] relative shrink-0 w-[40px]" data-name="Time">
      <svg
        className="absolute block inset-0 size-full"
        fill="none"
        height="13"
        preserveAspectRatio="none"
        viewBox="0 0 40 13"
        width="40"
      >
        <g clipPath="url(#clip0_0_36)" id="Time">
          <path d={svgPaths.p694a000} fill="black" id="Vector" />
        </g>
        <defs>
          <clipPath id="clip0_0_36">
            <rect fill="white" height="13" width="40" />
          </clipPath>
        </defs>
      </svg>
    </div>
  )
}

function Time() {
  return (
    <div
      className="bg-[rgba(255,255,255,0.8)] content-stretch flex flex-[1_0_0] h-[59px] items-center justify-center min-w-px overflow-clip relative"
      data-name="Time"
    >
      <Time1 />
    </div>
  )
}

function DynamicIslandFrame() {
  return (
    <div
      className="bg-[rgba(255,255,255,0.8)] content-stretch flex flex-[1_0_0] h-[59px] items-center justify-center min-w-px overflow-clip relative"
      data-name="Dynamic Island Frame"
    >
      <div
        className="bg-[rgba(0,0,0,0)] h-[37px] relative rounded-[20px] shrink-0 w-[125px]"
        data-name="Dynamic Island"
      />
    </div>
  )
}

function Reception() {
  return (
    <div className="h-[12px] relative shrink-0 w-[18px]" data-name="Reception">
      <svg
        className="absolute block inset-0 size-full"
        fill="none"
        height="12"
        preserveAspectRatio="none"
        viewBox="0 0 18 12"
        width="18"
      >
        <g clipPath="url(#clip0_0_29)" id="Reception">
          <path d={svgPaths.p1ec31400} fill="black" id="Vector" />
          <path d={svgPaths.p19f8d480} fill="black" id="Vector_2" />
          <path d={svgPaths.p13f4aa00} fill="black" id="Vector_3" />
          <path d={svgPaths.p1bfb7500} fill="black" id="Vector_4" />
        </g>
        <defs>
          <clipPath id="clip0_0_29">
            <rect fill="white" height="12" width="18" />
          </clipPath>
        </defs>
      </svg>
    </div>
  )
}

function WiFi() {
  return (
    <div className="h-[12px] relative shrink-0 w-[18px]" data-name="Wi-fi">
      <svg
        className="absolute block inset-0 size-full"
        fill="none"
        height="12"
        preserveAspectRatio="none"
        viewBox="0 0 18 12"
        width="18"
      >
        <g clipPath="url(#clip0_0_26)" id="Wi-fi">
          <path
            clipRule="evenodd"
            d={svgPaths.p2952ae40}
            fill="black"
            fillRule="evenodd"
            id="Vector"
          />
        </g>
        <defs>
          <clipPath id="clip0_0_26">
            <rect fill="white" height="12" width="18" />
          </clipPath>
        </defs>
      </svg>
    </div>
  )
}

function Battery() {
  return (
    <div className="h-[13px] relative shrink-0 w-[28px]" data-name="Battery">
      <svg
        className="absolute block inset-0 size-full"
        fill="none"
        height="13"
        preserveAspectRatio="none"
        viewBox="0 0 28 13"
        width="28"
      >
        <g clipPath="url(#clip0_0_20)" id="Battery">
          <path
            d={svgPaths.p3689d180}
            id="Vector"
            opacity="0.35"
            stroke="black"
          />
          <path
            d={svgPaths.p2a8bd780}
            fill="black"
            id="Vector_2"
            opacity="0.4"
          />
          <path d={svgPaths.p39726670} fill="black" id="Vector_3" />
        </g>
        <defs>
          <clipPath id="clip0_0_20">
            <rect fill="white" height="13" width="28" />
          </clipPath>
        </defs>
      </svg>
    </div>
  )
}

function Icons() {
  return (
    <div
      className="bg-[rgba(255,255,255,0.8)] content-stretch flex flex-[1_0_0] gap-[8px] h-[59px] items-center justify-center min-w-px overflow-clip relative"
      data-name="Icons"
    >
      <Reception />
      <WiFi />
      <Battery />
    </div>
  )
}

function StatusBar() {
  return (
    <div
      className="absolute bg-[rgba(255,255,255,0.8)] content-stretch flex h-[59px] items-center justify-center left-0 overflow-clip right-0 top-0"
      data-name="Status Bar"
    >
      <Time />
      <DynamicIslandFrame />
      <Icons />
    </div>
  )
}

function HomeBar() {
  return (
    <div
      className="absolute bg-[rgba(255,255,255,0)] content-stretch flex h-[34px] items-center justify-center left-0 overflow-clip pt-[13px] right-0 top-[898px]"
      data-name="Home Bar"
    >
      <div
        className="bg-black h-[5px] relative rounded-[3px] shrink-0 w-[134px]"
        data-name="Rectangle"
      />
    </div>
  )
}

function Frame2() {
  return (
    <div className="[word-break:break-word] absolute content-stretch flex flex-col gap-[8px] items-start left-[25px] top-[122px] w-[381px]">
      <p
        className="font-['Instrument_Sans:SemiBold',sans-serif] font-semibold leading-[normal] min-w-full relative shrink-0 text-[#212529] text-[24px] w-[min-content]"
        style={{ fontVariationSettings: '"wdth" 100' }}
      >
        Verify your identity (NIN)
      </p>
      <p
        className="font-['Instrument_Sans:Regular',sans-serif] font-normal leading-[22px] relative shrink-0 text-[#6c757d] text-[16px] w-[365px]"
        style={{ fontVariationSettings: '"wdth" 100' }}
      >
        Verification helps keep dart safe and trusted for everyone
      </p>
    </div>
  )
}

function Container() {
  return (
    <div
      className="content-stretch flex flex-col items-center relative shrink-0 w-full"
      data-name="Container"
    >
      <div className="[word-break:break-word] flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#495057] text-[11.586px] text-center whitespace-nowrap">
        <p className="leading-[normal]">JPG, PNG or PDF • Max 12MB</p>
      </div>
    </div>
  )
}

function Frame6() {
  return (
    <div className="-translate-x-1/2 -translate-y-1/2 absolute content-stretch flex flex-col gap-[6px] items-center left-[calc(50%+0.2px)] top-[calc(50%+0.43px)] w-[154.107px]">
      <div
        className="overflow-clip relative shrink-0 size-[30.895px]"
        data-name="fi-rr-cloud-upload"
      >
        <div className="absolute inset-[3.7%_0.01%_4.17%_0]" data-name="Vector">
          <svg
            className="absolute block inset-0 size-full"
            fill="none"
            height="28.4643"
            preserveAspectRatio="none"
            viewBox="0 0 30.8902 28.4643"
            width="30.8902"
          >
            <path d={svgPaths.p26322400} fill="#374957" id="Vector" />
          </svg>
        </div>
        <div
          className="absolute inset-[53.45%_20.83%_0_45.88%]"
          data-name="Vector"
        >
          <svg
            className="absolute block inset-0 size-full"
            fill="none"
            height="14.3808"
            preserveAspectRatio="none"
            viewBox="0 0 10.2822 14.3808"
            width="10.2822"
          >
            <path d={svgPaths.p31d4a000} fill="#374957" id="Vector" />
          </svg>
        </div>
      </div>
      <div className="[word-break:break-word] flex flex-col font-['Inter:Medium',sans-serif] font-medium justify-center leading-[0] min-w-full not-italic relative shrink-0 text-[#212529] text-[13.517px] text-center w-[min-content]">
        <p className="leading-[normal]">Choose from galery</p>
      </div>
      <Container />
    </div>
  )
}

function Frame5() {
  return (
    <div className="h-[150px] relative rounded-[12px] shrink-0 w-full">
      <div className="overflow-clip relative rounded-[inherit] size-full">
        <Frame6 />
      </div>
      <div
        aria-hidden
        className="absolute border-[#dee2e6] border-[0.936px] border-dashed inset-0 pointer-events-none rounded-[12px]"
      />
    </div>
  )
}

function Frame7() {
  return (
    <div className="content-stretch flex gap-[14.975px] items-center justify-center relative shrink-0 w-full">
      <div
        className="overflow-clip relative shrink-0 size-[18.718px]"
        data-name="fi-rr-camera"
      >
        <svg
          className="absolute block inset-0 size-full"
          fill="none"
          height="18.7182"
          preserveAspectRatio="none"
          viewBox="0 0 18.7182 18.7182"
          width="18.7182"
        >
          <path d={svgPaths.p8730240} fill="#6C757D" id="Vector" />
        </svg>
        <div
          className="absolute bottom-[16.67%] left-1/4 right-1/4 top-[33.33%]"
          data-name="Vector"
        >
          <svg
            className="absolute block inset-0 size-full"
            fill="none"
            height="9.35912"
            preserveAspectRatio="none"
            viewBox="0 0 9.35912 9.35912"
            width="9.35912"
          >
            <path d={svgPaths.p1dc1d8f0} fill="#6C757D" id="Vector" />
          </svg>
        </div>
      </div>
      <div className="[word-break:break-word] flex flex-col font-['Inter:Semi_Bold',sans-serif] font-semibold justify-center leading-[0] not-italic relative shrink-0 text-[#6c757d] text-[13.103px] text-center whitespace-nowrap">
        <p className="leading-[normal]">Take Photo</p>
      </div>
    </div>
  )
}

function Frame8() {
  return (
    <div className="bg-white h-[57px] relative rounded-[8px] shrink-0 w-full">
      <div className="flex flex-col items-center justify-center overflow-clip rounded-[inherit] size-full">
        <div className="content-stretch flex flex-col items-center justify-center px-[98.271px] py-[8.423px] relative size-full">
          <Frame7 />
        </div>
      </div>
      <div
        aria-hidden
        className="absolute border-[#dee2e6] border-[0.936px] border-solid inset-0 pointer-events-none rounded-[8px]"
      />
    </div>
  )
}

function Frame9() {
  return (
    <div className="content-stretch flex flex-col gap-[32px] items-start px-[8px] py-[12px] relative shrink-0 w-[380px]">
      <div
        aria-hidden
        className="absolute border-[rgba(233,236,239,0.54)] border-b border-solid inset-0 pointer-events-none"
      />
      <div className="[word-break:break-word] flex flex-col font-['Inter:Regular',sans-serif] font-normal justify-center leading-[0] not-italic relative shrink-0 text-[#6b7280] text-[16px] w-[315px]">
        <p className="leading-[22px]">{`Upload a clear image of your valid driver's license.`}</p>
      </div>
      <Frame5 />
      <Frame8 />
    </div>
  )
}

function Frame11() {
  return (
    <div className="-translate-x-1/2 absolute left-[calc(50%-0.5px)] rounded-[16px] top-[371px] w-[381px]">
      <div className="content-stretch flex flex-col items-start overflow-clip relative rounded-[inherit] size-full">
        <Frame9 />
      </div>
      <div
        aria-hidden
        className="absolute border border-[rgba(233,236,239,0.54)] border-solid inset-0 pointer-events-none rounded-[16px]"
      />
    </div>
  )
}

function Group() {
  return (
    <div
      className="absolute inset-[8.33%] mask-alpha mask-intersect mask-no-clip mask-no-repeat mask-position-[-1.583px_-1.583px] mask-size-[19px_19px]"
      style={{ maskImage: `url("${imgGroup}")` }}
      data-name="Group"
    >
      <div className="absolute inset-[-4.42%]">
        <svg
          className="block size-full"
          fill="none"
          height="17.2333"
          preserveAspectRatio="none"
          viewBox="0 0 17.2333 17.2333"
          width="17.2333"
        >
          <g id="Group">
            <path
              d={svgPaths.p199c8f00}
              id="Vector"
              stroke="#ADB5BD"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.4"
            />
            <path
              d={svgPaths.pd262480}
              id="Vector_2"
              stroke="#ADB5BD"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.4"
            />
          </g>
        </svg>
      </div>
    </div>
  )
}

function ClipPathGroup() {
  return (
    <div className="absolute contents inset-0" data-name="Clip path group">
      <Group />
    </div>
  )
}

function IconsaxCopy() {
  return (
    <div
      className="overflow-clip relative shrink-0 size-[19px]"
      data-name="iconsax-copy"
    >
      <ClipPathGroup />
    </div>
  )
}

function Frame4() {
  return (
    <div className="content-stretch flex gap-[4px] items-center justify-end relative shrink-0">
      <IconsaxCopy />
      <p
        className="[word-break:break-word] font-['Instrument_Sans:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#adb5bd] text-[18px] whitespace-nowrap"
        style={{ fontVariationSettings: '"wdth" 100' }}
      >
        Paste
      </p>
    </div>
  )
}

function Frame12() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-[80px]">
      <div className="flex h-[36px] items-center justify-center relative shrink-0 w-0">
        <div className="flex-none rotate-90">
          <div className="h-0 relative w-[36px]">
            <div className="absolute inset-[-1px_0_0_0]">
              <svg
                className="block size-full"
                fill="none"
                height="1"
                preserveAspectRatio="none"
                viewBox="0 0 36 1"
                width="36"
              >
                <line id="Line 22" stroke="#CED4DA" x2="36" y1="0.5" y2="0.5" />
              </svg>
            </div>
          </div>
        </div>
      </div>
      <Frame4 />
    </div>
  )
}

function Frame1() {
  return (
    <div className="content-stretch flex items-center justify-between relative shrink-0 w-[351px]">
      <p
        className="[word-break:break-word] font-['Instrument_Sans:Regular',sans-serif] font-normal leading-[normal] relative shrink-0 text-[#ced4da] text-[18px] whitespace-nowrap"
        style={{ fontVariationSettings: '"wdth" 100' }}
      >
        e.g 1234, 2345 456
      </p>
      <Frame12 />
    </div>
  )
}

function Frame10() {
  return (
    <div className="-translate-x-1/2 absolute bg-white content-stretch flex h-[58px] items-center justify-between left-[calc(50%+0.5px)] pl-[15px] pr-[14px] py-[8px] rounded-[12px] top-[252px] w-[381px]">
      <div
        aria-hidden
        className="absolute border border-[rgba(233,236,239,0.54)] border-solid inset-0 pointer-events-none rounded-[12px]"
      />
      <Frame1 />
    </div>
  )
}

export default function Nin() {
  return (
    <div className="bg-[#fcfcfc] relative size-full" data-name="nin">
      <Frame3 />
      <StatusBar />
      <HomeBar />
      <Frame2 />
      <Frame11 />
      <Frame10 />
      <p
        className="[word-break:break-word] absolute font-['Instrument_Sans:SemiBold',sans-serif] font-semibold leading-[normal] left-[25px] text-[#212529] text-[18px] top-[223px] w-[381px]"
        style={{ fontVariationSettings: '"wdth" 100' }}
      >
        Enter your NIN Number
      </p>
      <p
        className="[word-break:break-word] absolute font-['Instrument_Sans:SemiBold',sans-serif] font-semibold leading-[normal] left-[23px] text-[#212529] text-[18px] top-[336px] w-[381px]"
        style={{ fontVariationSettings: '"wdth" 100' }}
      >
        Upload your NIN Document
      </p>
    </div>
  )
}
