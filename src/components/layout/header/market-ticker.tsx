import React from 'react';

export const MarketTicker = () => {
    return (
        <div className='market-ticker' aria-label='Available Deriv markets'>
            <span className='market-ticker__badge'>Markets</span>
            <div className='market-ticker__viewport'>
                <div className='market-ticker__track'>
                    <div className='market-ticker__group'>
                        <span className='market-ticker__item'>
                            <span className='market-ticker__pulse' aria-hidden='true' />
                            <strong>Synthetic indices</strong>
                            <small>24/7</small>
                        </span>
                        <span className='market-ticker__item'>
                            <span className='market-ticker__pulse' aria-hidden='true' />
                            <strong>Digits</strong>
                            <small>Fast markets</small>
                        </span>
                        <span className='market-ticker__item'>
                            <span className='market-ticker__pulse' aria-hidden='true' />
                            <strong>Rise / Fall</strong>
                            <small>Live</small>
                        </span>
                        <span className='market-ticker__item'>
                            <span className='market-ticker__pulse' aria-hidden='true' />
                            <strong>Boom &amp; Crash</strong>
                            <small>Synthetic</small>
                        </span>
                    </div>
                    <div className='market-ticker__group' aria-hidden='true'>
                        <span className='market-ticker__item'>
                            <span className='market-ticker__pulse' aria-hidden='true' />
                            <strong>Synthetic indices</strong>
                            <small>24/7</small>
                        </span>
                        <span className='market-ticker__item'>
                            <span className='market-ticker__pulse' aria-hidden='true' />
                            <strong>Digits</strong>
                            <small>Fast markets</small>
                        </span>
                        <span className='market-ticker__item'>
                            <span className='market-ticker__pulse' aria-hidden='true' />
                            <strong>Rise / Fall</strong>
                            <small>Live</small>
                        </span>
                        <span className='market-ticker__item'>
                            <span className='market-ticker__pulse' aria-hidden='true' />
                            <strong>Boom &amp; Crash</strong>
                            <small>Synthetic</small>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MarketTicker;

