const fs = require('fs');
const file = 'd:/OLD LAPTOP/my works/GEMA-Project-recovery-branch/frontend/src/pages/EventDetailPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const bookingStartStr = '<Card id=\"booking-panel\"';
const bookingStartIndex = content.indexOf(bookingStartStr);
const cardEndStr = '</Card>';
const bookingEndIndex = content.indexOf(cardEndStr, bookingStartIndex) + cardEndStr.length;

const bookingPanelContent = content.substring(bookingStartIndex, bookingEndIndex);

const outschoolCard =             {/* Outschool Summary Card */}
            {isEducational && (
              <Card variant=\"glass\" className=\"sticky top-8 shadow-2xl mb-4\">
                <div className=\"bg-primary-50 rounded-t-xl p-6 border-b border-primary-100\">
                  <h2 className=\"text-xl font-bold text-gray-900\">{event.type || 'Live Group Course'}</h2>
                </div>
                <CardContent className=\"p-6\">
                  <div className=\"mb-6\">
                    <div className=\"flex items-baseline\">
                      <span className=\"text-4xl font-black text-gray-900\">{event.currency || 'AED'} {pricePerClass.toFixed(0)}</span>
                      <span className=\"text-gray-600 ml-2 font-medium\">per class</span>
                    </div>
                    {totalProgramPrice > 0 && (
                      <div className=\"text-gray-500 mt-1\">
                        or {event.currency || 'AED'} {totalProgramPrice.toFixed(0)} for {paidClassesCount + introClassesCount} classes
                      </div>
                    )}
                  </div>
                  
                  <div className=\"space-y-4 mb-8\">
                    <div className=\"flex items-center text-gray-700\">
                      <svg className=\"w-5 h-5 mr-3 text-gray-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z\" /></svg>
                      <span>{paidClassesCount + introClassesCount} classes total</span>
                    </div>
                    <div className=\"flex items-center text-gray-700\">
                      <svg className=\"w-5 h-5 mr-3 text-gray-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z\" /></svg>
                      <span>{event.dateSchedule?.[0]?.startTime && event.dateSchedule?.[0]?.endTime ? \\\\ - \\\\ : '50 min'}</span>
                    </div>
                    <div className=\"flex items-center text-gray-700\">
                      <svg className=\"w-5 h-5 mr-3 text-gray-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z\" /></svg>
                      <span>{event.venueType === 'Online' ? 'Live video meetings' : event.venueType}</span>
                    </div>
                    <div className=\"flex items-center text-gray-700\">
                      <svg className=\"w-5 h-5 mr-3 text-gray-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z\" /></svg>
                      <span>Ages {Array.isArray(event.ageRange) ? \\\\-\\\\ : event.ageRange}</span>
                    </div>
                    <div className=\"flex items-center text-gray-700\">
                      <svg className=\"w-5 h-5 mr-3 text-gray-400\" fill=\"none\" stroke=\"currentColor\" viewBox=\"0 0 24 24\"><path strokeLinecap=\"round\" strokeLinejoin=\"round\" strokeWidth={2} d=\"M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z\" /></svg>
                      <span>1-{event.dateSchedule?.[0]?.availableSeats || 5} learners per class</span>
                    </div>
                  </div>

                  <button 
                    onClick={() => {
                      document.getElementById('booking-panel')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className=\"w-full py-4 rounded-full font-bold text-lg bg-[#4000D3] hover:bg-[#2b008e] text-white transition-colors shadow-lg\"
                  >
                    See All Available Times
                  </button>
                </CardContent>
              </Card>
            )}

            {!isEducational && (
;

let removedBookingPanelContent = content.substring(0, bookingStartIndex) + outschoolCard + content.substring(bookingEndIndex);

const insertTargetStr = '{/* Modern Sidebar */}';
const insertIndex = removedBookingPanelContent.indexOf(insertTargetStr);

if (insertIndex === -1) {
    console.log('Error: Could not find insert target');
    process.exit(1);
}

const finalContent = removedBookingPanelContent.substring(0, insertIndex) + bookingPanelContent + '\n\n              ' + removedBookingPanelContent.substring(insertIndex);

fs.writeFileSync(file, finalContent);
console.log('Successfully moved booking panel and added Outschool card!');
